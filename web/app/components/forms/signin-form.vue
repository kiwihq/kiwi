<script setup lang="ts">
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
// import { toTypedSchema } from '@vee-validate/valibot'
import { EyeIcon, EyeOffIcon, GalleryVerticalEnd } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const props = defineProps<{
  class?: string
}>()

// Form state
const step = ref<'EMAIL' | 'PASSWORD' | 'MAGIC_CODE'>('EMAIL')
const isPending = ref(false)
const seePassword = ref(false)
const email = ref('')
const isExistingUser = ref<boolean | null>(null)
const authMethod = ref<'MAGIC_CODE' | 'CREDENTIALS' | null>(null)
const signupAllowed = ref(false)

// Get available auth methods
const {
  availableAuthMethods,
  checkEmail,
  login,
  signup,
  requestMagicCode,
  confirmMagicCode,
  redirectToProvider,
} = useAuth()

const methods = availableAuthMethods()

const showGoogleSignIn = computed(() => {
  return methods.google
})
const isMagicCodeAvailable = computed(() => {
  return methods.magic_code
})

// Computed properties for UI
const formTitle = computed(() => {
  if (step.value === 'EMAIL') return 'Login or Sign up'
  return isExistingUser.value ? 'Welcome back' : 'Create your account'
})

const formDescription = computed(() => {
  if (step.value === 'EMAIL') return 'Enter your email to continue'
  return isExistingUser.value ? 'Sign in to access your account' : 'Complete your registration'
})

// Form validation schemas
// const schema = computed(() => {
//   switch (step.value) {
//     case 'EMAIL':
//       return toTypedSchema(z.object({
//         email: z.string().email('Please enter a valid email'),
//       }))
//     case 'PASSWORD':
//       return toTypedSchema(z.object({
//         password: z.string().min(6, 'Password must be at least 6 characters'),
//       }))
//     case 'MAGIC_CODE':
//       return toTypedSchema(z.object({
//         code: z.string().min(6, 'Please enter the verification code'),
//       }))
//     default:
//       return null
//   }
// })

// Initialize form with dynamic validation
const { handleSubmit, resetForm } = useForm({
  // validationSchema: schema,
})

// Single submit handler for all steps
const onSubmit = handleSubmit(async (values) => {
  try {
    isPending.value = true

    switch (step.value) {
      case 'EMAIL': {
        const response = await checkEmail(values.email)
        email.value = values.email
        isExistingUser.value = response.existing
        signupAllowed.value = response.signup_allowed

        // Handle signup not allowed
        if (!response.signup_allowed && !response.existing) {
          toast.error('Signup is not allowed for this instance')
          return
        }

        // For new users, prefer magic code if available
        if (!response.existing && isMagicCodeAvailable.value) {
          authMethod.value = 'MAGIC_CODE'
          // await requestMagicCode(values.email)
          await signup({ email: values.email })
          toast.success('Verification code sent to your email')
          step.value = 'MAGIC_CODE'
          break
        }

        // For existing users or when magic code is not available, use the suggested method
        authMethod.value = response.status

        // Validate response against available methods
        if (response.status === 'MAGIC_CODE' && !isMagicCodeAvailable.value) {
          throw new Error('Magic code authentication is not available')
        }

        // If magic code is the auth method, request it immediately
        if (response.status === 'MAGIC_CODE') {
          await requestMagicCode(values.email)
          toast.success('Verification code sent to your email')
        }

        // Move to next step
        step.value = response.status === 'MAGIC_CODE' ? 'MAGIC_CODE' : 'PASSWORD'
        break
      }

      case 'PASSWORD': {
        const authData = {
          email: email.value,
          password: values.password,
        }

        if (isExistingUser.value) {
          await login(authData)
          toast.success('Logged in successfully')
        } else {
          await signup(authData)
          toast.success('Account created successfully')
        }
        resetForm()
        break
      }

      case 'MAGIC_CODE': {
        if (isExistingUser.value) {
          await confirmMagicCode(values.code)
          toast.success('Logged in successfully')
        } else {
          // await signup(authData)
          // toast.success('Account created successfully')
        }
        resetForm()
        break
      }
    }
  } catch (error: any) {
    toast.error(error.message || 'Authentication failed')
  } finally {
    isPending.value = false
  }
})

// Switch to magic code method if available
const switchToMagicCode = async () => {
  if (!isMagicCodeAvailable.value) return
  try {
    isPending.value = true
    await requestMagicCode(email.value)
    toast.success('Verification code sent to your email')
    step.value = 'MAGIC_CODE'
  } catch (error: any) {
    toast.error(error.message || 'Failed to request verification code')
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <form @submit.prevent="onSubmit">
      <div class="flex flex-col gap-6">
        <!-- Logo and Title Section -->
        <div class="flex flex-col items-center gap-2">
          <a class="flex flex-col items-center gap-2 font-medium" href="#">
            <div class="flex h-8 w-8 items-center justify-center rounded-md">
              <GalleryVerticalEnd class="size-6" />
            </div>
            <span class="sr-only">Acme Inc.</span>
          </a>
          <h1 class="text-xl font-bold">
            Welcome to Kiwi HRM
          </h1>
          <div class="text-center text-sm">
            {{ formDescription }}
          </div>
        </div>

        <!-- Form Fields -->
        <div class="flex flex-col gap-6">
          <!-- Email Input -->
          <FormField v-if="step === 'EMAIL'" v-slot="{ componentField }" name="email">
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="m@example.com" type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Password Input -->
          <FormField v-if="step === 'PASSWORD'" v-slot="{ componentField }" name="password">
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div class="flex items-center space-x-1.5">
                <Input
                  v-bind="componentField"
                  placeholder="Enter your password"
                  :disabled="isPending"
                  :type="seePassword ? 'text' : 'password'"
                />
                <Button
                  size="icon"
                  type="button"
                  variant="outline"
                  @click="seePassword = !seePassword"
                >
                  <EyeOffIcon v-if="seePassword" class="h-4 w-4" />
                  <EyeIcon v-else class="h-4 w-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Magic Code Input -->
          <FormField v-if="step === 'MAGIC_CODE'" v-slot="{ componentField }" name="code">
            <FormItem>
              <FormLabel>Verification Code</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="Enter verification code" type="text" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Submit Button -->
          <Button class="w-full" type="submit" :disabled="isPending">
            {{ isPending ? 'Processing...' : 'Continue' }}
          </Button>
        </div>

        <!-- Divider -->
        <div
          v-if="step === 'EMAIL' && showGoogleSignIn"
          class="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border"
        >
          <span class="relative z-10 bg-background px-2 text-muted-foreground">
            Or
          </span>
        </div>

        <!-- Social Login Buttons -->
        <div v-if="step === 'EMAIL' && showGoogleSignIn" class="grid gap-4 sm:grid-cols-2">
          <Button class="w-full" variant="outline">
            <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                fill="currentColor"
              />
            </svg>
            Continue with Apple
          </Button>
          <Button class="w-full" variant="outline" @click="redirectToProvider({ provider: 'google' })">
            <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      </div>
    </form>
    <div class="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
      By clicking continue, you agree to our <NuxtLink to="#">
        Terms of Service
      </NuxtLink>
      and <NuxtLink to="#">
        Privacy Policy
      </NuxtLink>.
    </div>
  </div>
</template>
