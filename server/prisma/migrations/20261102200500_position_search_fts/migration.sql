-- Búsqueda de texto sobre Position con FTS5 y tokenizador trigram: encuentra subcadenas (como `contains`)
-- usando un índice, en vez de recorrer la tabla entera con LIKE '%x%'.
-- Prisma no modela tablas virtuales: esta migración es SQL a mano y PositionSearch* no aparece en schema.prisma.
-- Es una tabla de "contenido externo": no duplica el texto, lee de Position(searchLc, locationLc) por rowid = id.
CREATE VIRTUAL TABLE "PositionSearch" USING fts5(
  searchLc, locationLc,
  content = 'Position', content_rowid = 'id',
  tokenize = 'trigram'
);

-- Indexa las filas que ya existen.
INSERT INTO "PositionSearch"("PositionSearch") VALUES ('rebuild');

-- Triggers: el índice se mantiene solo con cualquier INSERT, UPDATE o DELETE sobre Position.
CREATE TRIGGER "Position_search_ai" AFTER INSERT ON "Position" BEGIN
  INSERT INTO "PositionSearch"(rowid, searchLc, locationLc) VALUES (new.id, new.searchLc, new.locationLc);
END;

CREATE TRIGGER "Position_search_ad" AFTER DELETE ON "Position" BEGIN
  INSERT INTO "PositionSearch"("PositionSearch", rowid, searchLc, locationLc) VALUES ('delete', old.id, old.searchLc, old.locationLc);
END;

-- Solo al cambiar el texto: cerrar o reabrir una posición no toca el índice de búsqueda.
CREATE TRIGGER "Position_search_au" AFTER UPDATE OF searchLc, locationLc ON "Position" BEGIN
  INSERT INTO "PositionSearch"("PositionSearch", rowid, searchLc, locationLc) VALUES ('delete', old.id, old.searchLc, old.locationLc);
  INSERT INTO "PositionSearch"(rowid, searchLc, locationLc) VALUES (new.id, new.searchLc, new.locationLc);
END;
