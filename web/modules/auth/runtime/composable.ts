import type { RouteLocationRaw } from 'vue-router'

// @ts-expect-error vfs
import authconfig from '#build/auth.config'

// TODO: make this type configurable as well
/*
 * we can do:
 * import { $type } from 'my-helper-package'
 * {
 *   types: {
 *     user: () => $type<OurUser>()
 *   }
 * }
 */
type AuthUser<T = {}> = {
  access_level: 'owner' | 'admin' | 'member'
  email: string
  display_name: string
  roles: string[]
  permissions: Record<string, Record<string, boolean>>
  [key: string]: any
} & T

interface Company {
  slug: string
  name: string
  [key: string]: any
}

const BASE_PREFIX = '_allauth/app/v1'

export const AuthProcess = {
  LOGIN: 'login',
  CONNECT: 'connect',
} as const

type AuthProcessType = (typeof AuthProcess)[keyof typeof AuthProcess]

export const URLs = {
  CSRF: '_allauth/browser/v1/csrf',
  CONFIG: `${BASE_PREFIX}/config`,
  LOGIN: `${BASE_PREFIX}/auth/login`,
  SESSION: `${BASE_PREFIX}/auth/session`,
  SESSION_TOKEN: `${BASE_PREFIX}/auth/session/token`,
  SIGNUP: `${BASE_PREFIX}/auth/signup`,
  REQUEST_PASSWORD_RESET: `${BASE_PREFIX}/auth/password/request`,
  RESET_PASSWORD: `${BASE_PREFIX}/auth/password/reset`,
  VERIFY_EMAIL: `${BASE_PREFIX}/auth/email/verify`,
  PROVIDERS: `${BASE_PREFIX}/account/providers`,
  EMAIL: `${BASE_PREFIX}/account/email`,
  CHECK_EMAIL: `${BASE_PREFIX}/auth/email/check`,
  CHANGE_PASSWORD: `${BASE_PREFIX}/account/password/change`,

  // Switch company
  SWITCH_COMPANY: `/api/user/me/switch-company/`,

  // Auth: Social
  PROVIDER_SIGNUP: `${BASE_PREFIX}/auth/provider/signup`,
  PROVIDER_TOKEN: `${BASE_PREFIX}/auth/provider/token`,
  PROVIDER_CALLBACK: `${BASE_PREFIX}/auth/provider/callback`,
  REDIRECT_TO_PROVIDER: `${BASE_PREFIX}/auth/provider/redirect`,

  // Add new URLs for magic code authentication
  REQUEST_CODE: `${BASE_PREFIX}/auth/code/request`,
  CONFIRM_CODE: `${BASE_PREFIX}/auth/code/confirm`,
} as const

export const useAuth = <T = {}>(namespace: string = 'default') => {
  const url = useRequestURL()
  const config = useRuntimeConfig()

  const { $api, _route: route } = useNuxtApp()

  const prefix = namespace !== 'default' ? `${namespace}:` : ''

  const user = useStatefulCookie<AuthUser<T> | null>(`${prefix}user`, { default: () => null })
  const company = useStatefulCookie<Company | null>(`${prefix}org`, { default: () => null })

  const accessToken = useStatefulCookie<string | null>(`${prefix}access_token`, { default: () => null })
  const refreshToken = useStatefulCookie<string | null>(`${prefix}refresh_token`, { default: () => null })
  const sessionToken = useStatefulCookie<string | null>(`${prefix}session_token`, { default: () => null })
  const authenticatedAt = useStatefulCookie<number | null>(`${prefix}authenticated_at`, { default: () => null })

  const isAuthenticated = computed(() => !!accessToken.value && !!sessionToken.value)
  const onboarded = computed(() => user.value?.onboarded)

  const _roles = useStatefulCookie<string[]>(`${prefix}roles`, { default: () => [] })
  const _permissions = useStatefulCookie<Record<string, Record<string, boolean>>>(`${prefix}permissions`, { default: () => ({}) })

  const _getCookie = (name: string) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
  }

  const _getCsrfToken = async () => {
    const res = (await $api(URLs.CSRF, {
      trailingSlash: false,
      handleErrors: false,
      credentials: 'include',
      raw: true,
    })) as Response

    if (!res.ok) {
      throw new Error('Failed to fetch CSRF token')
    }

    return _getCookie('csrftoken')
  }

  const _request = async <T>(url: string, options: Record<string, any>) => {
    options.headers = options.headers || {}

    if (sessionToken.value) {
      options.headers['X-Session-Token'] = sessionToken.value
    }

    return await $api<T>(url, {
      ...options,
      trailingSlash: false,
      handleErrors: false,
      onResponse: async ({ response }) => {
        if ([200, 401].includes(response.status) && response._data?.meta?.session_token) {
          sessionToken.value = response._data.meta.session_token
        }
      },
    })
  }

  const _postForm = async (url: string, data: Record<string, any>) => {
    const f = document.createElement('form')
    f.method = 'POST'
    f.action = url
    Object.entries(data).forEach(([key, val]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = val
      f.appendChild(input)
    })

    document.body.appendChild(f)
    f.submit()
  }

  const _handleAuthSuccess = (data: any, meta: any) => {
    user.value = data?.user
    sessionToken.value = meta?.session_token
    accessToken.value = meta?.access_token
    refreshToken.value = meta?.refresh_token
    authenticatedAt.value = Date.now()
  }

  const _resetAuthState = () => {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    sessionToken.value = null
    authenticatedAt.value = null
    company.value = null
  }

  const _fetchPermissions = async (companySlug: string) => {
    const res = await $api<{ roles?: string[], access_level?: string, permissions: Record<string, Record<string, boolean>> }>(`/api/company/${companySlug}/permissions/`, {
      method: 'GET',
      protected: true,
    })

    _roles.value = [...(res?.roles || []), ...(res?.access_level ? [res.access_level] : [])]
    _permissions.value = res?.permissions || {}

    return res
  }

  const _fetchCompany = async (companySlug: string) => {
    const res = await $api<Company>(`/api/company/${companySlug}/`, {
      method: 'GET',
      protected: true,
    })

    company.value = res

    return res
  }

  // make this whole thing configureable
  const _handleRedirect = async (redirectData: any, explicitRedirectTo?: RouteLocationRaw | false) => {
    if (explicitRedirectTo === false) {
      return
    }
    if (explicitRedirectTo === undefined && redirectData?.redirect) {
      const next = redirectData.redirect
      switch (next) {
        case 'onboarding':
          if (authconfig.onboarding.enabled) {
            await navigateTo(authconfig.onboarding.route)
          } else {
            throw new Error('Onboarding is not enabled')
          }
          break
        case 'invitations':
          await navigateTo({ name: 'invitations' })
          break
        case 'create-company':
          await navigateTo({ name: 'company-create' })
          break
        case null:
        case undefined:
        case '':
          break
        default:
          await _fetchPermissions(next) // next is the company slug
          await _fetchCompany(next) // next is the company slug
          // TODO: make this configureable
          await navigateTo({ name: 'company-dashboard', params: { company: next } })
          break
      }
    }

    if (explicitRedirectTo === undefined && route.query.next) {
      await navigateTo(route.query.next.toString())
    }

    if (explicitRedirectTo) {
      await navigateTo(explicitRedirectTo)
    }
  }

  const availableAuthMethods = () => {
    return {
      credentials: true,
      google: config.public.auth?.google?.enabled ?? false,
      magic_code: config.public.auth?.magicCode?.enabled ?? false,
    }
  }

  const login = async (credentials: { email: string, password: string }, { redirectTo }: { redirectTo?: RouteLocationRaw | false } = {}) => {
    const { data, meta } = await _request<any>(URLs.LOGIN, { method: 'POST', body: credentials })
    _handleAuthSuccess(data, meta)
    await _handleRedirect(data?.user, redirectTo)
    return data
  }

  const logout = async ({ redirectTo }: { redirectTo?: RouteLocationRaw } = {}) => {
    try {
      await _request(URLs.SESSION, { method: 'DELETE' })
    } catch (error: any) {
      if ([401, 410].includes(error.response?.status)) {
        user.value = null
        accessToken.value = null
        refreshToken.value = null
        sessionToken.value = null
        authenticatedAt.value = null
        if (redirectTo) {
          await navigateTo(redirectTo)
        }
      } else {
        throw error
      }
    }
  }

  // Allauth helper functions
  const signup = async (data: Record<string, any>) => {
    return await _request(URLs.SIGNUP, { method: 'POST', body: data })
  }

  const refreshUser = async () => {
    const { data } = await _request<any>(URLs.SESSION, { method: 'GET' })

    user.value = data?.user
    // _handleRedirect(data?.user)

    return data
  }

  const requestPasswordReset = async (email: string) => {
    return await _request(URLs.REQUEST_PASSWORD_RESET, { method: 'POST', body: { email } })
  }

  const resetPassword = async (data: Record<string, any>) => {
    return await _request(URLs.RESET_PASSWORD, { method: 'POST', body: data })
  }

  const checkEmail = async (email: string) => {
    const { data } = await _request<any>(URLs.CHECK_EMAIL, { method: 'POST', body: { email } })
    return data as { existing: boolean, signup_allowed: boolean, status: 'MAGIC_CODE' | 'CREDENTIALS' }
  }

  const verifyEmail = async (key: string) => {
    const { data, meta } = await _request<any>(URLs.VERIFY_EMAIL, { method: 'POST', body: { key } })
    _handleAuthSuccess(data, meta)
    await _handleRedirect(data?.user)
    return data
  }

  const resendVerificationEmail = async (email: string) => {
    return await _request(URLs.EMAIL, { method: 'PUT', body: { email } })
  }

  const redirectToProvider = async ({ provider, redirect, process = AuthProcess.LOGIN }: { provider: string, redirect?: string, process?: AuthProcessType }) => {
    _postForm(`${config.public.api.baseURL}/${URLs.REDIRECT_TO_PROVIDER}`, {
      provider,
      process,
      callback_url: redirect ?? `${url.origin}/auth/${provider}/callback/`,
    })
  }

  const providerCallback = async (provider: string, payload: Record<string, any>) => {
    try {
      const { data, meta } = await _request<any>(`${URLs.PROVIDER_CALLBACK}/${provider}`, { method: 'POST', body: payload })
      _handleAuthSuccess(data, meta)
      await _handleRedirect(data?.user)
      return data
    } catch (error) {
      _resetAuthState()
      throw error
    }
  }

  const providerSignup = async ({ email }: { email: string }) => {
    return await _request(URLs.PROVIDER_SIGNUP, { method: 'POST', body: { email } })
  }

  const getProviderAccounts = async () => {
    return await _request(URLs.PROVIDERS, { method: 'GET' })
  }

  const disconnectProviderAccount = async (providerId: string, accountUid: string) => {
    return await _request(URLs.PROVIDERS, { method: 'DELETE', body: { provider: providerId, account: accountUid } })
  }

  const getEmailAddresses = async () => {
    return await _request(URLs.EMAIL, { method: 'GET' })
  }

  const addEmail = async (email: string) => {
    return await _request(URLs.EMAIL, { method: 'POST', body: { email } })
  }

  const deleteEmail = async (email: string) => {
    return await _request(URLs.EMAIL, { method: 'DELETE', body: { email } })
  }

  const markEmailAsPrimary = async (email: string) => {
    return await _request(URLs.EMAIL, { method: 'PATCH', body: { email, primary: true } })
  }

  const changePassword = async (data: Record<string, any>) => {
    return await _request(URLs.CHANGE_PASSWORD, { method: 'POST', body: data })
  }

  // TODO: move this to a separate store/composable
  const switchCompany = async (companySlug: string) => {
    const res = await $api(URLs.SWITCH_COMPANY, { method: 'PATCH', body: { company_slug: companySlug } })
    await _fetchCompany(companySlug)
    await _fetchPermissions(companySlug)

    await navigateTo({ name: route.name as string, params: { ...route.params, company: companySlug }, query: route.query, hash: route.hash })
    return res
  }

  const hasRole = (role: string) => {
    if (!_roles.value?.includes(role)) return false
    return _roles.value.includes(role)
  }

  const hasAnyRole = (roles: string[]) => {
    if (!_roles.value?.length) return false
    return roles.some(role => _roles.value!.includes(role))
  }

  const hasAllRoles = (roles: string[]) => {
    if (!_roles.value.length) return false
    return roles.every(role => _roles.value.includes(role))
  }

  const _hasFullAccess = () => {
    return hasAnyRole(authconfig.fullAccessRoles)
  }

  type Permission = `${string}.${string}` | string

  const hasPermission = (permission: Permission) => {
    // Check for full access roles first
    if (_hasFullAccess()) return true

    if (Object.keys(_permissions.value || {}).length === 0) return false

    if (permission.includes('.')) {
      const [resource, action] = permission.split('.')
      if (!resource || !action) return false
      return _permissions.value?.[resource]?.[action] ?? false
    }

    // Resource-only check - return true if any action is allowed for this resource
    return Object.keys(_permissions.value?.[permission] || {}).some(action => _permissions.value?.[permission]?.[action] === true)
  }

  const hasAnyPermission = (permissions: Permission[]) => {
    // Check for full access roles first
    if (_hasFullAccess()) return true

    if (!_permissions.value) return false
    return permissions.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: Permission[]) => {
    // Check for full access roles first
    if (_hasFullAccess()) return true

    if (!_permissions.value) return false
    return permissions.every(permission => hasPermission(permission))
  }

  // Add new methods for magic code authentication
  const requestMagicCode = async (email: string) => {
    try {
      return await _request(URLs.REQUEST_CODE, {
        method: 'POST',
        body: { email },
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        return error.response._data
      }
      throw error
    }
  }

  const confirmMagicCode = async (code: string) => {
    const { data, meta } = await _request<any>(URLs.CONFIRM_CODE, {
      method: 'POST',
      body: { code },
    })
    _handleAuthSuccess(data, meta)
    await _handleRedirect(data?.user)
    return data
  }

  return {
    token: shallowReadonly(accessToken),
    user: shallowReadonly(user),
    company,
    onboarded,
    isAuthenticated,
    switchCompany,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    availableAuthMethods,
    login,
    logout,
    signup,
    requestPasswordReset,
    resetPassword,
    checkEmail,
    verifyEmail,
    changePassword,
    providerSignup,
    redirectToProvider,
    refreshUser,
    resendVerificationEmail,
    getProviderAccounts,
    disconnectProviderAccount,
    getEmailAddresses,
    addEmail,
    deleteEmail,
    markEmailAsPrimary,
    providerCallback,
    requestMagicCode,
    confirmMagicCode,
  }
}
