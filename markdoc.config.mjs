import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    inset: {
      render: component('./src/components/Inset.astro'),
      attributes: {
        title: { type: String, required: false },
      },
    },
  },
});
