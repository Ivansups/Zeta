from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql.base import PGDialect
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import CreateIndex, CreateTable

from backend.db.base import Base

DIALECT = PGDialect()  # type: ignore[no-untyped-call]


class _Parent(Base):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(10))
    name: Mapped[str] = mapped_column(String(50), index=True)

    __table_args__ = (UniqueConstraint("code"),)


class _Child(Base):
    __tablename__ = "children"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id"))


def test_constraints_follow_naming_convention() -> None:
    ddl = str(CreateTable(_Parent.metadata.tables["parents"]).compile(dialect=DIALECT))
    ddl += str(CreateTable(_Child.metadata.tables["children"]).compile(dialect=DIALECT))

    assert "CONSTRAINT pk_parents PRIMARY KEY (id)" in ddl
    assert "CONSTRAINT uq_parents_code UNIQUE (code)" in ddl
    assert "CONSTRAINT fk_children_parent_id_parents FOREIGN KEY" in ddl


def test_indexes_follow_naming_convention() -> None:
    index = next(iter(_Parent.metadata.tables["parents"].indexes))

    ddl = str(CreateIndex(index).compile(dialect=DIALECT))

    assert "ix_parents_name" in ddl
