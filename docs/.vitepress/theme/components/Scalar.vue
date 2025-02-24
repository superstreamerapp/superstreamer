<script setup lang="ts">
import { ref, effect, onMounted } from "vue";
import { useData } from "vitepress";

const { frontmatter } = useData();
const iframeRef = ref();

onMounted(() => {
  window.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {}

    if (message?.type === "scalar:height" && iframeRef.value) {
      iframeRef.value.style.height = `${message.height}px`;
    }
  });
});

effect(() => {
  if (!iframeRef.value) {
    return;
  }

  const params = {
    url: frontmatter.value.spec,
    noScroll: true,
    config: {},
  };

  const url = `/scalar.html?params=${encodeURIComponent(JSON.stringify(params))}`;
  iframeRef.value.src = url;
});
</script>

<style scoped>
iframe {
  border: none;
  width: 100%;
  height: calc(100vh - var(--vp-nav-height));
  max-width: 1140px;
}
</style>

<template>
  <iframe ref="iframeRef" />
</template>
