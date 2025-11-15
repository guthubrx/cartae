# ============================================================================
# Dockerfile - PostgreSQL with pgvector extension
# ============================================================================
# Image PostgreSQL customisée avec:
# - pgvector extension (recherche vectorielle HNSW)
# - Configuration optimisée pour performance (100k+ items)
# ============================================================================

FROM postgres:16-alpine

# Metadata
LABEL maintainer="Cartae Project"
LABEL description="PostgreSQL 16 with pgvector extension for Cartae Database"

# Installation de pgvector depuis les sources (non disponible dans Alpine packages)
# pgvector permet de stocker et rechercher des embeddings vectoriels
RUN apk add --no-cache --virtual .build-deps \
  git \
  build-base \
  postgresql-dev \
  && git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
  && cd /tmp/pgvector \
  && make OPTFLAGS="" vector.so sql/vector--0.5.1.sql \
  && cp vector.so /usr/local/lib/postgresql/ \
  && cp sql/vector--*.sql /usr/local/share/postgresql/extension/ \
  && cp vector.control /usr/local/share/postgresql/extension/ \
  && cd / \
  && rm -rf /tmp/pgvector \
  && apk del .build-deps

# Configuration PostgreSQL pour performance
# Optimisé pour recherche vectorielle et full-text sur gros volumes
RUN echo "# Cartae custom config" >> /usr/local/share/postgresql/postgresql.conf.sample && \
  echo "shared_buffers = 256MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
  echo "effective_cache_size = 1GB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
  echo "maintenance_work_mem = 128MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
  echo "work_mem = 16MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
  echo "max_connections = 100" >> /usr/local/share/postgresql/postgresql.conf.sample

# Copier les scripts d'initialisation
# Exécutés dans l'ordre alphabétique au premier démarrage
COPY init-scripts/*.sql /docker-entrypoint-initdb.d/

# Healthcheck pour Docker Compose
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U ${POSTGRES_USER:-postgres} || exit 1

# Port PostgreSQL standard
EXPOSE 5432
