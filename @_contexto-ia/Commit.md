fix(query): busca 100 registros para garantir 30 finais

A subquery UltimosTrinta foi renomeada para UltimosCem e o LIMIT ampliado de 30 para 100. A mudança garante que, após aplicar filtro por tipo (CARTAO/PARCELADO) e deduplicação via DISTINCT ON, o resultado final contenha os 30 itens esperados em `ULTIMOS_LANCAMENTOS`.
