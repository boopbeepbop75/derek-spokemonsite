import re

unsupported_formats = r"\[gen [1-4]\]"

# Mons we want to collapse all forms into the base species
collapse_forms = ("greninja", "genesect", "zamazenta", "zacian", "arceus", "xerneas", "pumpkaboo", "mrmime",
                  "gourgeist", "silvally", "urshifu")

dex_exceptions = ("florges")

# Battle log lines to skip
skip_prefixes = (
    "|c|", "|j|", "|l|", "|-damage|", "|turn|",
    "|player|", "|rule|", "|inactive|", "|-fieldstart|",
    "|-fail|", "|n|", "|-resisted|", "|faint|", "|-miss|", "|-crit|",
    "|-boost|", "|-mega|", "|teamsize", "|gametype", "|gen", "|clearpoke",
    "|detailschange"
)

def clean_name(name: str) -> str:
    """Lowercase and strip a name to only letters/numbers."""
    return re.sub(r'[^a-zA-Z0-9]', '', name).lower().strip()

def clean_mon_name(name: str) -> str:
    base = name.lower().split("-")[0].replace(".", "") # grab the part before the first dash
    if base in collapse_forms:
        return base
    return name.lower().replace("%", "").replace(". ", "-")

def clean_mon_name_dex(name: str) -> str:
    base = name.lower()
    print(base)