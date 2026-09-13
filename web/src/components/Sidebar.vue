<script setup>
import { useI18n } from 'vue-i18n';
import Icon from './Icon.vue';

const { t } = useI18n();

const items = [
  { name: 'overview', icon: 'overview', labelKey: 'overview', to: '/home' },
  { name: 'apikeys', icon: 'apikeys', labelKey: 'apikeys', to: '/apikeys' },
  { name: 'usage', icon: 'usage', labelKey: 'usage', to: '/usage' },
  { name: 'models', icon: 'models', labelKey: 'models', to: '/models' },
  { name: 'accounts', icon: 'accounts', labelKey: 'accounts', to: '/accounts' },
  { name: 'logs', icon: 'logs', labelKey: 'logs', to: '/logs' },
  { name: 'settings', icon: 'settings', labelKey: 'settings', to: '/settings' },
];
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="logo">¢</span>
      <div class="brand-text">
        <div class="brand-name">CodeBuddy</div>
        <div class="brand-sub">Relay Plus</div>
      </div>
    </div>

    <nav class="nav">
      <router-link
        v-for="it in items"
        :key="it.name"
        :to="it.to"
        class="nav-item"
        active-class="active"
      >
        <span class="nav-rail"></span>
        <Icon :name="it.icon" :size="17" />
        <span>{{ t(`nav.${it.labelKey}`) }}</span>
      </router-link>
    </nav>

    <div class="footer">
      <span class="dot"></span>
      <span class="muted">{{ t('footer.powered') }}</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  border-right: 1px solid var(--border);
  padding: 18px 12px;
  z-index: 20;
  backdrop-filter: blur(16px) saturate(1.4);
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 8px 20px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.logo {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background-image: var(--brand-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 700;
  flex: none;
  box-shadow: 0 6px 16px -4px rgba(99, 102, 241, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.28);
}
.brand-name {
  font-weight: 750;
  font-size: 14.5px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.brand-sub {
  font-size: 11px;
  color: var(--text-2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 12px;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--text-2);
  font-weight: 550;
  font-size: 13.5px;
  transition: background-color 0.16s ease, color 0.16s ease;
}
.nav-rail {
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 0;
  border-radius: 0 3px 3px 0;
  background-image: var(--brand-gradient);
  transform: translateY(-50%);
  transition: height 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-item:hover {
  background: var(--surface-2);
  color: var(--text);
  text-decoration: none;
}
.nav-item.active {
  background: var(--primary-soft);
  color: var(--primary-text);
  font-weight: 650;
}
.nav-item.active .nav-rail { height: 18px; }
.footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 10px 2px;
  border-top: 1px solid var(--border);
  font-size: 12px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px var(--success-soft); }
  50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 12%, transparent); }
}
@media (max-width: 820px) {
  .sidebar {
    position: static;
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: 10px 12px;
    border-right: none;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }
  .brand { padding: 0 12px 0 4px; }
  .brand-sub { display: none; }
  .nav { flex-direction: row; margin: 0; }
  .nav-item { white-space: nowrap; }
  .footer { display: none; }
}
</style>
