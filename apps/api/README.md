# RentYourRide API

## Avatar uploads

User avatars are stored under `uploadsSubdir('avatars')` (`src/common/uploads-path.ts`). In production that is `$UPLOADS_DIR/avatars` when `UPLOADS_DIR` is set on the EC2 host (persistent across deploys). If `UPLOADS_DIR` is unset, files land in `<cwd>/uploads/avatars`, which is **not** durable across deploys.
