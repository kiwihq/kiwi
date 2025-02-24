<script setup lang="ts">
import SignInForm from '@/components/forms/signin-form.vue'

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="magicpattern flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
    <div className="w-full max-w-sm">
      <SignInForm />
    </div>
  </div>
</template>

<style>
.magicpattern {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center center;
  background-repeat: repeat;
  background-image: url("assets/svgs/magicpattern.svg");
}
</style>
