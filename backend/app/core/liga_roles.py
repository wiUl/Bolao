from enum import Enum

class LigaRole(str, Enum):
    dono = "dono"
    admin_liga = "admin_liga"
    membro = "membro"