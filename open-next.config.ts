// OpenNext Cloudflare Adapter Configuration
// https://opennext.js.org/cloudflare

export default {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  edge: {
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
    },
  },
};
