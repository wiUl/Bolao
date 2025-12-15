from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    LEAGUE_ADMIN = "league_admin"