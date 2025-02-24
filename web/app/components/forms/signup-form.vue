<script setup lang="ts">
import type { TRegister } from '@/validators/auth-schema'

import PasswordStrength from '@/components/password-strength.vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AuthService } from '@/services/auth.service'
import { registerSchema } from '@/validators/auth-schema'
import { useMutation } from '@tanstack/vue-query'
import { toTypedSchema } from '@vee-validate/zod'
import { EyeIcon, EyeOffIcon } from 'lucide-vue-next'
import { useForm } from 'vee-validate'

import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { toast } from 'vue-sonner'

const props = defineProps<{
  class?: string
}>()

const authService = new AuthService()

const seePassword = ref(false)

// Initialize form
const { handleSubmit, useFieldModel } = useForm({
  validationSchema: toTypedSchema(registerSchema),
})

const _password = useFieldModel('password')

const router = useRouter()

// Use mutation for signup
const { mutateAsync, isPending } = useMutation({
  mutationFn: async (values: TRegister) => {
    return authService.register({
      name: values.name,
      email: values.email,
      password: values.password,
    })
  },
  onSuccess: () => {
    toast.success('Account created successfully')
    router.push('/sign-in')
  },
  onError: (error: Error) => {
    toast.error(error.message)
  },
})

const onSubmit = handleSubmit(async (values: TRegister) => {
  await mutateAsync(values)
})
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card>
      <CardHeader class="text-center">
        <CardTitle class="text-xl">
          Create an account
        </CardTitle>
        <CardDescription>
          Sign up to get started with KeyNest
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="onSubmit">
          <div class="grid gap-6">
            <!-- <div class="flex flex-col gap-4">
              <Button variant="outline" type="button" class="w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                    fill="currentColor"
                  />
                </svg>
                Sign up with Apple
              </Button>
              <Button variant="outline" type="button" class="w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Sign up with Google
              </Button>
            </div>
            <div class="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span class="relative z-10 bg-background px-2 text-muted-foreground">
                or continue with
              </span>
            </div> -->
            <div class="grid gap-6">
              <FormField v-slot="{ componentField }" name="name">
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" :disabled="isPending" placeholder="John Doe" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="email">
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" :disabled="isPending" type="email" placeholder="m@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="password">
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl />
                  <div class="flex items-center space-x-1.5">
                    <Input v-bind="componentField" :disabled="isPending" :type="seePassword ? 'text' : 'password'"
                      placeholder="Enter your password" />
                    <Button type="button" variant="outline" size="icon" @click="seePassword = !seePassword">
                      <template v-if="seePassword">
                        <EyeOffIcon class="h-4 w-4 text-zinc-700" />
                      </template>
                      <template v-else>
                        <EyeIcon class="h-4 w-4 text-zinc-700" />
                      </template>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              </FormField>

              <!-- <PasswordStrength v-if="password" :password="password" class="mt-2" /> -->

              <Button type="submit" class="w-full" :disabled="isPending">
                {{ isPending ? 'Creating account...' : 'Create account' }}
              </Button>
            </div>
            <div class="text-center text-sm">
              Already have an account?
              <RouterLink to="/sign-in" class="underline underline-offset-4">
                Sign in
              </RouterLink>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
    <div
      class="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
      By clicking continue, you agree to our <a href="#">Terms of Service</a>
      and <a href="#">Privacy Policy</a>.
    </div>
  </div>
</template>
