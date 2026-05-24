<template>
  <el-button
    :loading="loading"
    :disabled="disabled || loading"
    :type="type"
    :size="size"
    @click="handleClick"
    :class="[className]"
  >
    <slot>{{ loading ? '处理中...' : text }}</slot>
  </el-button>
</template>

<script>
export default {
  name: 'LoadingButton',
  props: {
    text: { type: String, default: '确定' },
    type: { type: String, default: 'primary' },
    size: { type: String, default: 'small' },
    disabled: { type: Boolean, default: false },
    className: { type: String, default: '' }
  },
  data() {
    return {
      loading: false
    }
  },
  methods: {
    async handleClick() {
      this.loading = true
      try {
        this.$emit('click')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>