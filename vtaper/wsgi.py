import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vtaper.settings")
application = get_wsgi_application()


def ensure_legacy_tables():
    from django.db import DatabaseError, connection

    from fitness.models import User, Workout

    existing_tables = set(connection.introspection.table_names())
    for model in (User, Workout):
        if model._meta.db_table in existing_tables:
            continue
        try:
            with connection.schema_editor() as schema_editor:
                schema_editor.create_model(model)
        except DatabaseError:
            if model._meta.db_table not in connection.introspection.table_names():
                raise
        existing_tables.add(model._meta.db_table)


ensure_legacy_tables()
