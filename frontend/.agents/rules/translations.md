---
paths:
  - "src/messages/*.json"
  - "**/*.tsx"
---

# Translations

- Never hardcode user-facing strings.
- Use the centralized i18n system.
- Translation keys must be flat and kebab-case into language files.
- Labels must not use dots in key names.
- Never add new labels into sub-objects in `src/messages/*.json`.

## Migration Rules

If a component uses nested translations, migrate to flat keys. Use these rules as the source of truth (ignore current code structure):

- Never use nested keys.
- Always extract nested keys into the parent object of the language JSON file.
- Use `const t = useTranslations()` as reference for translations.
- Apply labels with `t('label')`.
