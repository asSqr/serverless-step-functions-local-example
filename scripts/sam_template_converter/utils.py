def kebab_to_upper_camel_case(kebab_str: str) -> str:
    def _capitalize_first_letter(input: str) -> str:
        return f'{input[0].capitalize()}{input[1:]}'

    return ''.join(
        list(
            map(_capitalize_first_letter, kebab_str.split('-'))
        )
    )
