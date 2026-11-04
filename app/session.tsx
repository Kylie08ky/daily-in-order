import {createContext,useContext} from 'react';
import type {User} from 'firebase/auth';
export const SessionContext=createContext<User|null>(null);
export function useSession(){const user=useContext(SessionContext);if(!user)throw new Error('请先登录');return user;}
