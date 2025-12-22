import path from "node:path";

import postcss from "postcss";
import postcssrc from "postcss-load-config";

import pkg from "./package.json" with { type: "json" };

export default function eleventyPluginPostcss(eleventyConfig, options = {}) {
  eleventyConfig.versionCheck(pkg["11ty"].compatibility);

  let postcssConfig = {
    options: {},
    plugins: [],
  };

  options = Object.assign({
    templateFormats: ["css", "pcss", "postcss"],
  }, options);

  eleventyConfig.addTemplateFormats(options.templateFormats);

  eleventyConfig.addExtension(options.templateFormats, {
    outputFileExtension: "css",

    useLayouts: false,

    init: async () => {
      try {
        postcssConfig = await postcssrc();
      } catch (error) {
        console.log(`WARN: Eleventy Plugin (${pkg.name}): ${error.message}`);
      }
    },

    compileOptions: {
      permalink: (inputContent, inputPath) => () => {
        if (path.parse(inputPath).name.startsWith("_")) {
          return false;
        }
      },
    },

    compile: async (inputContent, inputPath) => {
      return async ({ page: { outputPath } }) => {
        const { options, plugins } = postcssConfig;

        return await postcss(plugins)
          .process(inputContent, { ...options, from: inputPath, to: outputPath })
          .then(result => result.css);
      };
    },
  });
}
