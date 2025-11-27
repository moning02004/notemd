from sqlalchemy.orm import Session


class Repository:
    DB_MODEL = None

    def __init__(self, db: Session):
        self.db = db

    def get_by_pk(self, pk: int | str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.pk == pk).first()
        return instance

    def get_by_hash_id(self, hash_id: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.hash_id == hash_id).first()
        return instance
