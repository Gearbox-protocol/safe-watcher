export function isECS() {
  return Boolean(process.env.ECS_CONTAINER_METADATA_URI_V4);
}
