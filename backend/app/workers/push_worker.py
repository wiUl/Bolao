import time
from app.database import SessionLocal
from app.services.push_scheduler import run_missing_bet_alerts

def main():
    while True:
        db = SessionLocal()
        try:
            run_missing_bet_alerts(db)
        finally:
            db.close()
        time.sleep(60)

if __name__ == "__main__":
    main()
