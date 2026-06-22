export const TOKEN_KEY = 'PLANGO_TOKEN'
export const USER_KEY = 'PLANGO_USER'

export const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
