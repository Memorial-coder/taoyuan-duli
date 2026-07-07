<template>
  <Suspense>
    <ProcessingView />
    <template #fallback>
      <div class="workshop-route-loading" data-testid="workshop-route-loading" role="status" aria-live="polite">
        <div class="workshop-route-loading__tabs" aria-hidden="true">
          <span v-for="index in 3" :key="index" class="workshop-route-loading__tab"></span>
        </div>
        <div class="workshop-route-loading__panel">
          <div class="workshop-route-loading__header">
            <span class="workshop-route-loading__title">正在进入工坊...</span>
            <span class="workshop-route-loading__spinner" aria-hidden="true"></span>
          </div>
          <div class="workshop-route-loading__line workshop-route-loading__line--short"></div>
          <div class="workshop-route-loading__grid" aria-hidden="true">
            <span v-for="index in 6" :key="index" class="workshop-route-loading__block"></span>
          </div>
        </div>
      </div>
    </template>
  </Suspense>
</template>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'

  const waitForFirstWorkshopPaint = () => new Promise<void>(resolve => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 0)
    })
  })

  const ProcessingView = defineAsyncComponent({
    loader: async () => {
      await waitForFirstWorkshopPaint()
      return import('@/views/game/ProcessingView.vue')
    },
    delay: 0
  })
</script>

<style scoped>
  .workshop-route-loading {
    min-width: 0;
  }

  .workshop-route-loading__tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
    margin-bottom: 0.75rem;
  }

  .workshop-route-loading__tab,
  .workshop-route-loading__block,
  .workshop-route-loading__line {
    border: 1px solid rgba(200, 164, 92, 0.12);
    background: linear-gradient(90deg, rgba(200, 164, 92, 0.08), rgba(200, 164, 92, 0.16), rgba(200, 164, 92, 0.08));
    background-size: 220% 100%;
    animation: workshop-loading-sheen 1.2s ease-in-out infinite;
  }

  .workshop-route-loading__tab {
    min-height: 2.25rem;
    border-radius: 2px;
  }

  .workshop-route-loading__panel {
    min-height: min(34rem, 68vh);
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    padding: 0.75rem;
  }

  .workshop-route-loading__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .workshop-route-loading__title {
    color: var(--color-accent);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .workshop-route-loading__spinner {
    width: 0.875rem;
    height: 0.875rem;
    flex: 0 0 auto;
    border: 2px solid rgba(200, 164, 92, 0.22);
    border-top-color: var(--color-accent);
    border-radius: 999px;
    animation: workshop-loading-spin 0.8s linear infinite;
  }

  .workshop-route-loading__line {
    height: 1.75rem;
    border-radius: 2px;
    margin-bottom: 0.75rem;
  }

  .workshop-route-loading__line--short {
    width: min(22rem, 100%);
  }

  .workshop-route-loading__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    gap: 0.5rem;
  }

  .workshop-route-loading__block {
    min-height: 5.25rem;
    border-radius: 2px;
  }

  @keyframes workshop-loading-sheen {
    from {
      background-position: 120% 0;
    }

    to {
      background-position: -120% 0;
    }
  }

  @keyframes workshop-loading-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .workshop-route-loading__tab,
    .workshop-route-loading__block,
    .workshop-route-loading__line,
    .workshop-route-loading__spinner {
      animation: none;
    }
  }
</style>
