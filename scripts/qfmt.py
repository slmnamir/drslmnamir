"""Compact item constructor used by catalog files."""


def Q(**k):
    return k


def item(
    g,
    id,
    d,
    s,
    diff,
    sex,
    age,
    setting,
    rf,
    p,
    ex,
    ix,
    q,
    ans,
    distractors,
    why,
    whys,
    pearl,
    trap,
    lo,
    guide=None,
    age_label=None,
    noun=None,
):
    if not isinstance(distractors, (list, tuple)):
        raise TypeError(
            f"{id}: distractors must be a list (got {type(distractors).__name__}). "
            "A field was probably skipped (rf/p/ex/ix/q)."
        )
    if not isinstance(whys, (list, tuple)):
        raise TypeError(f"{id}: whys must be a list (got {type(whys).__name__}).")
    if not isinstance(ans, str):
        raise TypeError(f"{id}: ans must be a string (got {type(ans).__name__}).")
    opts = [ans, *distractors]

    if len(whys) != len(distractors):
        raise ValueError(f"{id}: {len(distractors)} distractors vs {len(whys)} whys")
    rec = dict(
        _g=g,
        id=id,
        d=d,
        s=s,
        diff=diff,
        sex=sex,
        age=age,
        set=setting,
        rf=rf,
        p=p,
        ex=ex,
        ix=ix,
        q=q,
        opt=opts,
        ans=ans,
        why=why,
        w=whys,
        pearl=pearl,
        trap=trap,
        lo=lo,
        g=guide,
    )
    if age_label:
        rec["age_label"] = age_label
    if noun:
        rec["noun"] = noun
    return rec
