from app import app
from models import db
from models.user import User
from services.user_service import _hash_password
import datetime

with app.app_context():
    # Make sure we don't have an existing admin user
    sysadmin = User.query.filter_by(username='sysadmin').first()
    if not sysadmin:
        sysadmin = User(
            username='sysadmin',
            email='admin@medicare.local',
            password_hash=_hash_password('admin123'),
            first_name='System',
            last_name='Admin',
            profile_completed=True,
            is_admin=True,
            created_at=datetime.datetime.utcnow()
        )
        db.session.add(sysadmin)
        db.session.commit()
        print("Created pure sysadmin account.")
    else:
        sysadmin.is_admin = True
        sysadmin.password_hash = _hash_password('admin123')
        db.session.commit()
        print("Updated sysadmin account.")
