import argparse
import os
import re
import unicodedata

import pandas as pd


def _normalize_col(name: str) -> str:
    name = (
        unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode("ascii")
    )
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name or "col"


def _first_existing_column(df, candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None


def run_anova(
    input_csv, y_col, time_col=None, factor_col=None, interaction=False, out_csv=None
):
    from statsmodels.formula.api import ols
    from statsmodels.stats.anova import anova_lm

    df = pd.read_csv(input_csv, encoding="utf-8", low_memory=False)
    df.columns = [_normalize_col(c) for c in df.columns]

    y = _normalize_col(y_col)
    if y not in df.columns:
        raise ValueError(f"No existe la columna Y: {y}")

    time_candidates = [_normalize_col(time_col)] if time_col else []
    time_candidates += ["periodo", "semestre_num", "semestre", "year", "ano"]
    time = _first_existing_column(df, time_candidates)
    if not time:
        raise ValueError("No se encontró columna de tiempo.")

    factor_candidates = [_normalize_col(factor_col)] if factor_col else []
    factor_candidates += ["nivelgral", "nivel", "facultad", "sede"]
    factor = _first_existing_column(df, factor_candidates)
    if not factor:
        raise ValueError("No se encontró columna de factor.")

    df[y] = pd.to_numeric(df[y], errors="coerce")
    df = df.dropna(subset=[y, time, factor])

    if df.empty:
        raise ValueError("No hay filas válidas después de filtrar nulls.")

    formula = f"{y} ~ C({time}) + C({factor})"
    if interaction:
        formula = f"{y} ~ C({time}) * C({factor})"

    model = ols(formula, data=df).fit()
    table = anova_lm(model, typ=2).reset_index().rename(columns={"index": "term"})

    if out_csv:
        os.makedirs(os.path.dirname(out_csv), exist_ok=True)
        table.to_csv(out_csv, index=False, encoding="utf-8")

    pvals = table.set_index("term")["PR(>F)"].to_dict()
    return formula, len(df), pvals, table


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--y", required=True)
    parser.add_argument("--time", required=False, default="periodo")
    parser.add_argument("--factor", required=False, default="nivelgral")
    parser.add_argument("--interaction", action="store_true")
    parser.add_argument("--output", required=False, default=None)
    args = parser.parse_args()

    formula, n, pvals, table = run_anova(
        input_csv=args.input,
        y_col=args.y,
        time_col=args.time,
        factor_col=args.factor,
        interaction=args.interaction,
        out_csv=args.output,
    )

    print(formula)
    print(n)
    print(table.to_string(index=False))


if __name__ == "__main__":
    main()
