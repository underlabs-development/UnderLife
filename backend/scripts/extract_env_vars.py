import re  # noqa: INP001
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

NOT_SET = object()

settings_files = [
    "base.py",
    "development.py",
    "production.py",
]
settings_path = Path("lexroom_backend") / "settings"


@dataclass()
class EnvVar:
    name: str
    required: bool
    found_in: list[str]
    default_value: Any = NOT_SET


env_vars: dict[str, EnvVar] = {}
env_value_re = re.compile(
    r"env(?:\.\w+)?\(\s*\"(?P<name>[\w-]+)\"(?:,\s*default=(?P<default>[\w\W\[\],\"\.]+)?,?\s*)?\)",
)
for setting_file in settings_files:
    with (settings_path / setting_file).open() as f:
        accumulated_line = ""  # multiline env vars
        for lineno, raw_line in enumerate(f, start=1):
            line = raw_line.strip()
            if line.startswith("#") or not line:
                continue

            # Skip lines that are not env vars when not processing multiline env vars
            if not accumulated_line and ("env." not in line and "env(" not in line):
                continue

            # ensure line has closing parenthesis. FIXME: improve it, not always reliable
            if ")" not in line:
                accumulated_line += line
                continue

            final_line = accumulated_line + line if accumulated_line else line
            accumulated_line = ""

            # Special case to be excluded
            if (
                "env.read_env(" in final_line
                or "env.str(env.DEFAULT_DATABASE_ENV)" in final_line
                or "env.CLOUDSQL" in final_line
            ):
                continue

            # Special case for DATABASE_URL
            if "env.db_url(" in final_line:
                env_var = EnvVar(
                    name="DATABASE_URL", required=True, found_in=[setting_file]
                )
                if "default=" in final_line:
                    env_var.default_value = (
                        final_line.split("default=")[1].strip().replace('"', "")
                    )
                    env_var.required = False
            else:
                m = env_value_re.search(final_line)
                if not m:
                    print(  # noqa: T201
                        f"Could not parse line '{final_line}' (lineno: {lineno}) in {setting_file}"
                    )
                    sys.exit(1)

                matches = m.groupdict(NOT_SET)
                if "name" not in matches:
                    raise ValueError(
                        f"Could not extract env var name from line '{final_line}' (lineno: {lineno}) in {setting_file}"
                    )

                default = matches.get("default", NOT_SET)
                env_var = EnvVar(
                    name=matches["name"],
                    required=default is NOT_SET,
                    default_value=default,
                    found_in=[setting_file],
                )

            if env_var.name in env_vars:
                env_var.found_in = [*env_vars[env_var.name].found_in, setting_file]

            env_vars[env_var.name] = env_var


print("Project environment variables:")  # noqa: T201

requireds = filter(lambda v: v.required, env_vars.values())
optionals = filter(lambda v: not v.required, env_vars.values())

print("### Required:")  # noqa: T201
for env_var in sorted(requireds, key=lambda v: v.name):
    print(f" * `{env_var.name}`")  # noqa: T201

print("### Optional:")  # noqa: T201
for env_var in sorted(optionals, key=lambda v: v.name):
    print(f" * `{env_var.name}` (default: {env_var.default_value.replace(',', '')})")  # noqa: T201
