import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { queryClient } from '../lib/queryClient'
import { rpcError, supabase } from '../lib/supabase'

export type MyStore = { id: string; name: string; isOwner: boolean }

export const useGetMyStores = () => {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['myStores', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyStore[]> => {
      // Accept pending invitations for this phone before listing memberships.
      rpcError((await supabase.rpc('accept_invitations')).error)
      const { data, error } = await supabase
        .from('store_members')
        .select('is_owner, stores!inner(id, name)')
        .eq('user_id', userId!)
        .is('deleted_at', null)
        .is('stores.deleted_at', null)
      rpcError(error)
      return (data ?? []).map((m: any) => ({ id: m.stores.id, name: m.stores.name, isOwner: m.is_owner }))
    },
  })
}

export const useCreateStore = () =>
  useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc('create_store', { p_name: name.trim() })
      rpcError(error)
      return data as string
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myStores'] }),
  })

export const useGetMyPermissions = (storeId: string | undefined) =>
  useQuery({
    queryKey: ['myPermissions', storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc('my_permissions', { p_store: storeId })
      rpcError(error)
      return (data ?? []) as string[]
    },
  })
