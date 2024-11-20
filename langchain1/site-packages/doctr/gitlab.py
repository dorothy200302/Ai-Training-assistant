def create_secure_gitlab_variable(key, value, project):
    """
    Create key=value as a secure gitlab variable

    `project` should be either a numeric project id or namespace/project_name.
    """
    {
        "key": key,
        "value": value,
        "protected": True,
        "masked": True,
    }
