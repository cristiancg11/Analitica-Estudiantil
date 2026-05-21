import argparse
import os

import pandas as pd


def _build_periodo_from_year_semestre(df, year_col="year", semestre_col="semestre"):
    if year_col in df.columns and semestre_col in df.columns:
        year = pd.to_numeric(df[year_col], errors="coerce").astype("Int64")
        sem = pd.to_numeric(df[semestre_col], errors="coerce").astype("Int64")
        return year.astype("string") + "-" + sem.astype("string")
    return None


def _anova_two_groups(df, y, group_col, alpha=0.05, out_csv=None):
    import scipy.stats as stats

    df = df[[y, group_col]].copy()
    df[y] = pd.to_numeric(df[y], errors="coerce")
    df = df.dropna(subset=[y, group_col])

    groups = []
    group_names = []
    for name, g in df.groupby(group_col, dropna=False):
        vals = g[y].dropna().astype(float).tolist()
        if vals:
            group_names.append(str(name))
            groups.append(vals)

    if len(groups) < 2:
        raise ValueError("ANOVA requiere al menos 2 grupos con datos.")

    f_stat, p_value = stats.f_oneway(*groups)
    significativo = bool(p_value < alpha)

    table = pd.DataFrame(
        [
            {
                "factor": group_col,
                "grupos": len(groups),
                "grupo_1": group_names[0] if len(group_names) > 0 else None,
                "n_1": len(groups[0]) if len(groups) > 0 else 0,
                "grupo_2": group_names[1] if len(group_names) > 1 else None,
                "n_2": len(groups[1]) if len(groups) > 1 else 0,
                "F": float(f_stat),
                "p_value": float(p_value),
                "alpha": float(alpha),
                "significativo": significativo,
            }
        ]
    )

    if out_csv:
        os.makedirs(os.path.dirname(out_csv), exist_ok=True)
        table.to_csv(out_csv, index=False, encoding="utf-8")

    return float(f_stat), float(p_value), significativo, table


def _tukey_posthoc(df, y, group_col, alpha=0.05, out_csv=None):
    from statsmodels.stats.multicomp import pairwise_tukeyhsd

    df = df[[y, group_col]].copy()
    df[y] = pd.to_numeric(df[y], errors="coerce")
    df = df.dropna(subset=[y, group_col])

    tukey = pairwise_tukeyhsd(endog=df[y], groups=df[group_col], alpha=alpha)
    summary = tukey.summary()

    rows = summary.data
    out_df = pd.DataFrame(rows[1:], columns=rows[0])

    if out_csv:
        os.makedirs(os.path.dirname(out_csv), exist_ok=True)
        out_df.to_csv(out_csv, index=False, encoding="utf-8")

    return tukey, out_df


def compare(clean_dir, mode, out_csv, alpha=0.05):
    mode = mode.lower().strip()
    clean_dir = os.path.abspath(clean_dir)

    if mode == "matriculados":
        univalle_path = os.path.join(clean_dir, "5f3a-r7ic_clean.csv")
        unal_path = os.path.join(clean_dir, "5pqr-ifsd_clean.csv")
        univalle_value_col = "total_estudiantes"
    elif mode == "graduados":
        univalle_path = os.path.join(clean_dir, "96ss-2484_clean.csv")
        unal_path = os.path.join(clean_dir, "3j5e-x7c4_clean.csv")
        univalle_value_col = "total"
    else:
        raise ValueError("mode debe ser: matriculados | graduados")

    df_univalle = pd.read_csv(univalle_path, encoding="utf-8", low_memory=False)
    if "periodo" not in df_univalle.columns:
        raise ValueError("UNIVALLE requiere columna periodo")

    df_univalle[univalle_value_col] = pd.to_numeric(
        df_univalle[univalle_value_col], errors="coerce"
    )
    uni_agg = (
        df_univalle.dropna(subset=["periodo", univalle_value_col])
        .groupby("periodo", as_index=False)[univalle_value_col]
        .sum()
    )
    uni_agg = uni_agg.rename(columns={univalle_value_col: "y"})
    uni_agg["institucion"] = "UNIVALLE"

    chunks = []
    for chunk in pd.read_csv(unal_path, encoding="utf-8", low_memory=False, chunksize=200000):
        periodo = chunk["periodo"] if "periodo" in chunk.columns else _build_periodo_from_year_semestre(chunk)
        if periodo is None:
            raise ValueError("UNAL requiere periodo o year+semestre")
        tmp = pd.DataFrame({"periodo": periodo}).dropna(subset=["periodo"])
        chunks.append(tmp.groupby("periodo", as_index=False).size().rename(columns={"size": "y"}))
    unal_agg = pd.concat(chunks, ignore_index=True).groupby("periodo", as_index=False)["y"].sum()
    unal_agg["institucion"] = "UNAL"

    df_cmp = pd.concat([uni_agg, unal_agg], ignore_index=True)
    f_stat, p_value, significativo, table = _anova_two_groups(
        df_cmp, y="y", group_col="institucion", alpha=alpha, out_csv=out_csv
    )
    tukey, tukey_df = _tukey_posthoc(
        df_cmp,
        y="y",
        group_col="institucion",
        alpha=alpha,
        out_csv=os.path.join("output", "anova", f"tukey_{mode}_unal_vs_univalle.csv"),
    )
    return f_stat, p_value, significativo, table, tukey, tukey_df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", required=True, choices=["matriculados", "graduados"])
    parser.add_argument(
        "--clean_dir", required=False, default=os.path.join("output", "clean_from_raw")
    )
    parser.add_argument("--output", required=False, default=None)
    args = parser.parse_args()

    out_csv = args.output
    if out_csv is None:
        out_csv = os.path.join("output", "anova", f"anova_{args.mode}_unal_vs_univalle.csv")

    f_stat, p_value, significativo, table, tukey, tukey_df = compare(
        args.clean_dir, args.mode, out_csv=out_csv, alpha=0.05
    )
    print(f"Estadístico F: {f_stat:.3f}")
    print(f"Valor p: {p_value:.6g}")
    print(f"Diferencia significativa (alpha=0.05): {significativo}")
    print(table.to_string(index=False))
    print("=================================")
    print("POST-HOC TUKEY HSD")
    print("=================================")
    print(tukey)


if __name__ == "__main__":
    main()
