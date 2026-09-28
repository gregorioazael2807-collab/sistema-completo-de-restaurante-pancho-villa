"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { cartKey: string; productId: string; slug: string; name: string; price: number; currency: string; image: string | null; quantity: number; instructions?: string; modifierIds: string[]; modifierNames: string[] };
type AddModifier = { id: string; name: string; priceDelta: number };
type CartContextValue = { items: CartItem[]; add: (item: Omit<CartItem, "cartKey" | "quantity" | "instructions" | "modifierIds" | "modifierNames">, modifiers?: AddModifier[]) => void; setQuantity: (cartKey: string, quantity: number) => void; setInstructions: (cartKey: string, instructions: string) => void; remove: (cartKey: string) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("pancho-villa-cart") ?? "[]") as unknown; const restored: CartItem[] = Array.isArray(saved) ? saved.flatMap((raw: unknown) => { if (!raw || typeof raw !== "object") return []; const entry = raw as Partial<CartItem>; if (typeof entry.productId !== "string") return []; return [{ cartKey: entry.cartKey ?? entry.productId, productId: entry.productId, slug: entry.slug ?? "", name: entry.name ?? "", price: entry.price ?? 0, currency: entry.currency ?? "EUR", image: entry.image ?? null, quantity: entry.quantity ?? 1, instructions: entry.instructions, modifierIds: entry.modifierIds ?? [], modifierNames: entry.modifierNames ?? [] }]; }) : []; setItems(restored); } catch { setItems([]); } setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem("pancho-villa-cart", JSON.stringify(items)); }, [items, ready]);
  const add = useCallback((item: Omit<CartItem, "cartKey" | "quantity" | "instructions" | "modifierIds" | "modifierNames">, modifiers: AddModifier[] = []) => setItems((current) => {
    const modifierIds = modifiers.map((modifier) => modifier.id).sort();
    const cartKey = `${item.productId}:${modifierIds.join(",")}`;
    const found = current.find((entry) => entry.cartKey === cartKey);
    if (found) return current.map((entry) => entry.cartKey === cartKey ? { ...entry, quantity: Math.min(20, entry.quantity + 1) } : entry);
    return [...current, { ...item, cartKey, price: item.price + modifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0), quantity: 1, modifierIds, modifierNames: modifiers.map((modifier) => modifier.name) }];
  }), []);
  const setQuantity = useCallback((cartKey: string, quantity: number) => setItems((current) => quantity <= 0 ? current.filter((entry) => entry.cartKey !== cartKey) : current.map((entry) => entry.cartKey === cartKey ? { ...entry, quantity: Math.min(20, quantity) } : entry)), []);
  const setInstructions = useCallback((cartKey: string, instructions: string) => setItems((current) => current.map((entry) => entry.cartKey === cartKey ? { ...entry, instructions } : entry)), []);
  const remove = useCallback((cartKey: string) => setItems((current) => current.filter((entry) => entry.cartKey !== cartKey)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, add, setQuantity, setInstructions, remove, clear }), [items, add, setQuantity, setInstructions, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used within CartProvider"); return value; }
