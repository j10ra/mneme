# Self-hosted deploys (Coolify, plain Docker, anything OCI).
#
# Why this exists alongside nixpacks.toml: Nixpacks builds against a Nix-provided
# Bun whose loader only searches /nix/store, so the native deps cannot resolve
# system libraries. onnxruntime-node (via @xenova/transformers) and sharp both
# dlopen libstdc++.so.6 at runtime and fail with ERR_DLOPEN_FAILED even though
# the library is present in /usr/lib. Adding apt packages does not help, since
# the Nix loader never looks there. A glibc base image with the libraries on the
# normal search path sidesteps the whole problem.
#
# Railway keeps using nixpacks.toml + Procfile; this file is for everyone else.
FROM oven/bun:1

WORKDIR /app

# Runtime libraries for the native deps. sharp also bundles its own libvips, but
# installing the system one keeps it working if the bundled prebuild is missing
# for the platform.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libstdc++6 libgomp1 libvips42 \
 && rm -rf /var/lib/apt/lists/*

COPY . .
RUN bun install --frozen-lockfile

# Bake the bge-small embedder into the image so the first semantic query is a
# warm load rather than a ~130MB download (#59). Same cache dir the server reads
# via MNEME_EMBED_CACHE_DIR in packages/server/src/lib/embedder.ts.
ENV MNEME_EMBED_CACHE_DIR=/app/.embed-cache
RUN bun run build:embed-model

ENV NODE_ENV=production
ENV PORT=3100
EXPOSE 3100

# No release phase needed: scripts/migrate.ts is callable from the server boot
# path, so the server applies pending migrations itself on startup.
CMD ["bun", "run", "start"]
