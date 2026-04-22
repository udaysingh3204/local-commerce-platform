import { useEffect, useState } from "react"
import {
  ActivityIndicator, Alert, Pressable, SafeAreaView,
  ScrollView, Text, TextInput, View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing } from "../../theme"
import type { RootNavProp } from "../../navigation/types"
import { fetchJson } from "@local-commerce-platform/mobile-shared"
import { API_BASE_URL } from "../../config/env"

type AvailablePromotion = {
  campaignId: string; name: string; code?: string | null
  type?: string
  discount?: { percentage?: number; flatAmount?: number }
  metadata?: { audience?: string; source?: string; vibe?: string; quiz?: { prompt?: string; answer?: string } }
  daysRemaining?: number
  budgetProgress?: number
  remainingUses?: number | null
}
type AppliedPromo = { campaignId: string; code?: string | null; name: string; discountAmount: number }
type OrderCreateResponse = { message: string; order: { _id: string } }
type PuzzleMission = {
  id: string
  badge: string
  title: string
  prompt: string
  answer: string
  rewardText: string
  rewardCode?: string | null
  rewardCampaignId?: string | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "")
const titleSignal = (promo?: AvailablePromotion | null) =>
  (promo?.name ?? "").replace(/[^a-z0-9]/gi, "").length || 0
const audienceSignal = (promo?: AvailablePromotion | null) =>
  String(promo?.metadata?.audience ?? promo?.metadata?.source ?? promo?.type ?? "all").replace(/[_\s]+/g, " ").trim()
const campaignPrompt = (promo?: AvailablePromotion | null, fallback?: string) =>
  promo?.metadata?.quiz?.prompt?.trim() || fallback || "Decode the live drop"
const campaignAnswer = (promo?: AvailablePromotion | null, fallback?: string) =>
  promo?.metadata?.quiz?.answer?.trim() || fallback || ""
const promoPersona = (promo: AvailablePromotion) => {
  if (promo.discount?.percentage) return { badge: "Hot Drop", copy: "Certified steal. Loud enough for the group chat." }
  if (promo.discount?.flatAmount) return { badge: "Snack Money", copy: "Flat money off. Tiny chaos, maximum smugness." }
  return { badge: "Mystery Move", copy: "Not basic. Tap in and let the backend do its thing." }
}

export default function CheckoutScreenV2() {
  const nav = useNavigation<RootNavProp>()
  const { user, cartItems, cartStoreId, cartItemCount, subtotal, increaseQty, decreaseQty, removeFromCart, clearCart, withAuth } = useApp()

  const [promos, setPromos] = useState<AvailablePromotion[]>([])
  const [applied, setApplied] = useState<AppliedPromo | null>(null)
  const [couponInput, setCouponInput] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [applyingCode, setApplyingCode] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | "online">("cash_on_delivery")
  const [paymentStep, setPaymentStep] = useState<"idle" | "creating" | "processing" | "verifying">("idle")
  const [puzzleInput, setPuzzleInput] = useState("")
  const [activeMissionIndex, setActiveMissionIndex] = useState(0)
  const [solvedMissionIds, setSolvedMissionIds] = useState<string[]>([])
  const [quizMessage, setQuizMessage] = useState<string | null>(null)

  const finalTotal = Math.max(0, subtotal - (applied?.discountAmount ?? 0))
  const totalUnits = cartItems.reduce((sum, line) => sum + line.quantity, 0)

  const missionDeck = (() => {
    const bestPromo = promos
      .map((promo) => ({ promo, estimate: promo.discount?.flatAmount ?? Math.floor(subtotal * (promo.discount?.percentage ?? 0) / 100) }))
      .sort((a, b) => b.estimate - a.estimate)[0]?.promo ?? promos[0] ?? null
    const secondPromo = promos.find((promo) => promo.campaignId !== bestPromo?.campaignId) ?? bestPromo
    const subtotalDigit = Math.abs(Math.round(subtotal)) % 10
    const featuredCode = bestPromo?.code ?? secondPromo?.code ?? null
    const featuredAudience = audienceSignal(bestPromo)
    const reserveAudience = audienceSignal(secondPromo)

    const missions: PuzzleMission[] = [
      {
        id: `audience-${bestPromo?.campaignId ?? "fallback"}`,
        badge: bestPromo?.metadata?.source ? `${bestPromo.metadata.source} drop` : "Campaign read",
        title: bestPromo?.name ? `${bestPromo.name} signal check` : "Campaign signal check",
        prompt: bestPromo
          ? campaignPrompt(bestPromo, `This live campaign is aimed at which audience tag: ${featuredAudience}, local hype, or midnight rush?`)
          : `What is ${cartItemCount} + ${Math.max(totalUnits, 1)} + ${subtotalDigit}?`,
        answer: bestPromo
          ? campaignAnswer(bestPromo, featuredAudience)
          : String(cartItemCount + Math.max(totalUnits, 1) + subtotalDigit),
        rewardText: bestPromo?.name ? `Unlock ${bestPromo.name}` : "Unlock the best available drop",
        rewardCode: bestPromo?.code ?? null,
        rewardCampaignId: bestPromo?.campaignId ?? null,
      },
      {
        id: `name-${secondPromo?.campaignId ?? featuredCode ?? "fallback"}`,
        badge: secondPromo?.metadata?.vibe ?? "Campaign decoder",
        title: secondPromo?.name ? `${secondPromo.name} checksum` : "Coupon decoder",
        prompt: secondPromo?.name
          ? campaignPrompt(
              secondPromo,
              `How many letters and digits are in the live campaign title ${secondPromo.name}?`
            )
          : featuredCode
            ? `How many characters are in ${featuredCode}?`
            : `What's the first digit in your current subtotal ${Math.max(1, Math.round(subtotal))}?`,
        answer: secondPromo?.name
          ? campaignAnswer(secondPromo, String(titleSignal(secondPromo)))
          : featuredCode
            ? String(featuredCode.replace(/[^a-z0-9]/gi, "").length)
            : String(String(Math.max(1, Math.round(subtotal)))[0]),
        rewardText: secondPromo?.code ? `Reveal ${secondPromo.code}` : "Reveal a backend-picked hint",
        rewardCode: secondPromo?.code ?? null,
        rewardCampaignId: secondPromo?.campaignId ?? null,
      },
      {
        id: `window-${bestPromo?.campaignId ?? cartStoreId ?? "store"}-${totalUnits}`,
        badge: "Expiry radar",
        title: bestPromo?.daysRemaining != null ? "Campaign window" : "Crew energy multiplier",
        prompt: bestPromo?.daysRemaining != null
          ? `How many days are left on the hottest live campaign: ${bestPromo.daysRemaining}, ${bestPromo.daysRemaining + 3}, or ${Math.max(bestPromo.daysRemaining - 2, 0)}?`
          : `If your ${cartItemCount} cart lines each drop ${Math.max(totalUnits, 2)} hype points, what's the total?`,
        answer: bestPromo?.daysRemaining != null ? String(bestPromo.daysRemaining) : String(cartItemCount * Math.max(totalUnits, 2)),
        rewardText: featuredCode ? `Autofill ${featuredCode} like a menace` : "Autofill the loudest promo we have",
        rewardCode: featuredCode,
        rewardCampaignId: bestPromo?.campaignId ?? null,
      },
    ]

    return missions
  })()
  const activeMission = missionDeck[activeMissionIndex] ?? null

  useEffect(() => {
    setActiveMissionIndex((current) => (missionDeck.length ? Math.min(current, missionDeck.length - 1) : 0))
    setPuzzleInput("")
    setQuizMessage(null)
  }, [missionDeck.length, subtotal, cartItemCount, totalUnits])

  // Load available promotions when cart changes
  useEffect(() => {
    if (cartItems.length === 0 || !cartStoreId) { setPromos([]); return }
    const fetch = async () => {
      setPromoLoading(true)
      try {
        const q = new URLSearchParams({
          products: JSON.stringify(cartItems.map((l) => ({ productId: l.product._id, quantity: l.quantity }))),
          totalAmount: String(subtotal),
          storeId: cartStoreId,
        })
        const resp = await withAuth<{ promotions: AvailablePromotion[] }>(`/api/promotions/available/for-order?${q}`)
        setPromos(resp.promotions ?? [])
      } catch { setPromos([]) } finally { setPromoLoading(false) }
    }
    void fetch()
  }, [cartItems.length, subtotal, cartStoreId])

  const applyBest = async () => {
    if (promos.length === 0) { setPromoError("No eligible offers for this cart"); return }
    const best = promos
      .map((p) => ({ p, est: p.discount?.flatAmount ?? Math.floor(subtotal * (p.discount?.percentage ?? 0) / 100) }))
      .sort((a, b) => b.est - a.est)[0]
    if (!best) return
    await applyByCampaign(best.p.campaignId, best.p.name, best.p.code)
  }

  const applyByCampaign = async (campaignId: string, campaignName: string, code?: string | null) => {
    setApplyingCode(true); setPromoError(null)
    try {
      const resp = await withAuth<{ campaignId: string; discount: number; campaign?: AvailablePromotion }>(
        `/api/promotions/${campaignId}/apply`,
        { method: "POST", body: JSON.stringify({ order: buildPreview() }) }
      )
      setApplied({
        campaignId: resp.campaignId,
        code: code ?? resp.campaign?.code ?? null,
        name: campaignName,
        discountAmount: Math.max(0, Number((resp as any).discountAmount ?? resp.discount ?? 0)),
      })
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Unable to apply offer")
    } finally { setApplyingCode(false) }
  }

  const applyCouponCode = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) { setPromoError("Enter a coupon code"); return }
    setApplyingCode(true); setPromoError(null)
    try {
      const resp = await withAuth<{ campaignId: string; discount: number; campaign?: AvailablePromotion }>(
        `/api/promotions/code/${encodeURIComponent(code)}/apply`,
        { method: "POST", body: JSON.stringify({ order: buildPreview() }) }
      )
      setApplied({
        campaignId: resp.campaignId,
        code,
        name: resp.campaign?.name ?? code,
        discountAmount: Math.max(0, Number((resp as any).discountAmount ?? resp.discount ?? 0)),
      })
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Invalid or expired coupon")
    } finally { setApplyingCode(false) }
  }

  const buildPreview = () => ({
    customerId: user?._id, storeId: cartStoreId,
    items: cartItems.map((l) => ({ productId: l.product._id, quantity: l.quantity, price: l.product.price })),
    subtotal,
    totalAmount: subtotal,
  })

  const unlockQuizOffer = async () => {
    if (!activeMission) return
    if (normalizeAnswer(puzzleInput) !== normalizeAnswer(activeMission.answer)) {
      setQuizMessage("Nope. Brain lag detected. Reboot the neurons and try again.")
      return
    }

    setSolvedMissionIds((current) => current.includes(activeMission.id) ? current : [...current, activeMission.id])
    const rewardPromo = promos.find((promo) => promo.campaignId === activeMission.rewardCampaignId)

    if (rewardPromo) {
      await applyByCampaign(rewardPromo.campaignId, rewardPromo.name, rewardPromo.code)
      setQuizMessage(`Main character behavior. ${rewardPromo.name} just landed on your cart.`)
      return
    }

    if (activeMission.rewardCode) {
      setCouponInput(activeMission.rewardCode)
      setQuizMessage(`W rizz. Secret drop unlocked: ${activeMission.rewardCode}`)
      return
    }

    setQuizMessage("Brain buff unlocked. Hit 'Apply Best Offer' for the hidden sauce.")
  }

  const placeOrder = async () => {
    if (!user || !cartStoreId || cartItems.length === 0) return
    setPlacing(true)
    setPaymentStep("idle")
    try {
      // Step 1: Create the order
      const createdOrder = await fetchJson<OrderCreateResponse>(API_BASE_URL, "/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: user._id, storeId: cartStoreId,
          items: cartItems.map((l) => ({ productId: l.product._id, quantity: l.quantity, price: l.product.price })),
          totalAmount: finalTotal,
          paymentMethod: paymentMethod === "online" ? "razorpay" : "cod",
          customerLocation: { lat: 12.9716, lng: 77.5946 },
          deliveryAddress: { line: "Customer app checkout", city: "Bengaluru", pincode: "560001" },
          promotion: applied ? { campaignId: applied.campaignId, code: applied.code, name: applied.name, discountAmount: applied.discountAmount } : undefined,
        }),
      })

      const orderId = createdOrder.order._id

      // Step 2: Online payment flow
      if (paymentMethod === "online") {
        setPaymentStep("creating")
        const payResp = await withAuth<{ razorpayOrderId: string; amount: number; isMock: boolean }>(
          `/api/payment/create-order`,
          { method: "POST", body: JSON.stringify({ orderId, amount: finalTotal }) }
        )
        setPaymentStep("processing")
        // Small artificial delay so the user sees "Processing payment…" feedback
        await new Promise((r) => setTimeout(r, 1200))
        setPaymentStep("verifying")
        await withAuth("/api/payment/verify", {
          method: "POST",
          body: JSON.stringify({
            orderId,
            razorpayOrderId: payResp.razorpayOrderId,
            razorpayPaymentId: `mock_pay_${Date.now()}`,
            razorpaySignature: `mock_sig_${Date.now()}`,
          }),
        })
      }

      clearCart()
      setApplied(null)
      setCouponInput("")
      setPuzzleInput("")
      setSolvedMissionIds([])
      setActiveMissionIndex(0)
      setQuizMessage(null)
      setPaymentStep("idle")
      Alert.alert(
        paymentMethod === "online" ? "Payment Successful 🎉" : "Order Placed! 🎉",
        paymentMethod === "online" ? "Payment confirmed. Your order is being prepared!" : "Your order has been placed successfully.",
        [{ text: "View Orders", onPress: () => nav.navigate("Tabs") }]
      )
    } catch (e) {
      setPaymentStep("idle")
      Alert.alert("Order Failed", e instanceof Error ? e.message : "Something went wrong")
    } finally { setPlacing(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        backgroundColor: Colors.bgCard, ...Shadow.sm,
      }}>
        <Pressable onPress={() => nav.goBack()} style={{ marginRight: Spacing.md, padding: 4 }}>
          <Text style={{ fontSize: 22, color: Colors.primary }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: Font.lg, fontWeight: "900", color: Colors.text, flex: 1 }}>
          Checkout
        </Text>
        <View style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full }}>
          <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "800" }}>{cartItemCount} items</Text>
        </View>
      </View>

      {cartItems.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <Text style={{ fontSize: 64 }}>🛒</Text>
          <Text style={{ fontSize: Font.xl, fontWeight: "800", color: Colors.text, marginTop: 16 }}>Your cart is empty</Text>
          <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 4, textAlign: "center" }}>
            Add items from a store to get started
          </Text>
          <Pressable
            onPress={() => nav.navigate("Tabs")}
            style={{ marginTop: 24, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: Radius.full }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.md }}>Browse Stores</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 120 }}>
          {/* Cart Items */}
          <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
            CART ITEMS
          </Text>
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.xl, overflow: "hidden", marginBottom: Spacing.lg, ...Shadow.sm }}>
            {cartItems.map((line, idx) => (
              <View key={line.product._id} style={{
                flexDirection: "row", alignItems: "center", padding: Spacing.lg,
                borderBottomWidth: idx < cartItems.length - 1 ? 1 : 0, borderBottomColor: Colors.border,
              }}>
                <View style={{
                  width: 48, height: 48, borderRadius: Radius.md,
                  backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md,
                }}>
                  <Text style={{ fontSize: 24 }}>📦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Font.md, fontWeight: "700", color: Colors.text }} numberOfLines={1}>{line.product.name}</Text>
                  <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "700", marginTop: 2 }}>
                    {fmt(line.product.price)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Pressable
                    onPress={() => decreaseQty(line.product._id)}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bgMuted, justifyContent: "center", alignItems: "center" }}
                  >
                    <Text style={{ color: Colors.text, fontWeight: "900", fontSize: Font.lg }}>−</Text>
                  </Pressable>
                  <Text style={{ width: 28, textAlign: "center", fontWeight: "900", fontSize: Font.md, color: Colors.text }}>{line.quantity}</Text>
                  <Pressable
                    onPress={() => increaseQty(line.product._id)}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.lg }}>+</Text>
                  </Pressable>
                </View>
                <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.text, marginLeft: Spacing.md, minWidth: 56, textAlign: "right" }}>
                  {fmt(line.product.price * line.quantity)}
                </Text>
              </View>
            ))}
          </View>

          {/* Promotions */}
          <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
            OFFERS & COUPONS
          </Text>
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm }}>
            <View style={{
              backgroundColor: "#111827",
              borderRadius: Radius.xl,
              padding: Spacing.lg,
              marginBottom: Spacing.md,
              borderWidth: 1,
              borderColor: "#312e81",
            }}>
              <Text style={{ color: "#a5b4fc", fontSize: Font.sm, fontWeight: "800", letterSpacing: 1.2 }}>CHAOS COUPON LAB</Text>
              <Text style={{ color: "#fff", fontSize: Font.lg, fontWeight: "900", marginTop: 6 }}>
                Dynamic missions are live. Solve a tiny brain teaser, bully the price down.
              </Text>
              <Text style={{ color: "#cbd5e1", fontSize: Font.sm, marginTop: 6, lineHeight: 20 }}>
                This deck now reads live campaign data. Pick a mission, crack it, and we’ll use the actual promotion metadata instead of making the whole thing feel fake.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                {missionDeck.map((mission, index) => {
                  const solved = solvedMissionIds.includes(mission.id)
                  const active = index === activeMissionIndex
                  return (
                    <Pressable
                      key={mission.id}
                      onPress={() => { setActiveMissionIndex(index); setPuzzleInput(""); setQuizMessage(null) }}
                      style={{
                        width: 150,
                        borderRadius: Radius.lg,
                        padding: Spacing.md,
                        backgroundColor: active ? "#172554" : "#0f172a",
                        borderWidth: 1,
                        borderColor: solved ? "#34d399" : active ? "#60a5fa" : "#334155",
                      }}
                    >
                      <Text style={{ color: solved ? "#86efac" : "#93c5fd", fontSize: Font.xs, fontWeight: "800", letterSpacing: 1 }}>{mission.badge.toUpperCase()}</Text>
                      <Text style={{ color: "#fff", fontSize: Font.md, fontWeight: "800", marginTop: 6 }}>{mission.title}</Text>
                      <Text style={{ color: "#cbd5e1", fontSize: Font.xs, marginTop: 6, lineHeight: 16 }}>{mission.rewardText}</Text>
                      <Text style={{ color: solved ? "#86efac" : "#fbbf24", fontSize: Font.xs, fontWeight: "800", marginTop: 10 }}>
                        {solved ? "Unlocked" : active ? "Live now" : "Tap to play"}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {activeMission ? (
                <View style={{ marginTop: Spacing.md, borderRadius: Radius.lg, backgroundColor: "#0f172a", padding: Spacing.md, borderWidth: 1, borderColor: "#334155" }}>
                  <Text style={{ color: "#fbbf24", fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.1 }}>{activeMission.badge.toUpperCase()}</Text>
                  <Text style={{ color: "#fff", fontSize: Font.md, fontWeight: "900", marginTop: 6 }}>{activeMission.title}</Text>
                  <Text style={{ color: "#cbd5e1", fontSize: Font.sm, marginTop: 6, lineHeight: 20 }}>{activeMission.prompt}</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }}>
                <TextInput
                  value={puzzleInput}
                  onChangeText={setPuzzleInput}
                  placeholder="Your answer"
                  placeholderTextColor="#94a3b8"
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: "#0f172a",
                    borderRadius: Radius.md,
                    paddingHorizontal: Spacing.md,
                    color: "#fff",
                    borderWidth: 1,
                    borderColor: activeMission && solvedMissionIds.includes(activeMission.id) ? "#10b981" : "#334155",
                  }}
                />
                <Pressable
                  onPress={() => void unlockQuizOffer()}
                  style={{
                    paddingHorizontal: Spacing.lg,
                    height: 44,
                    borderRadius: Radius.md,
                    backgroundColor: activeMission && solvedMissionIds.includes(activeMission.id) ? Colors.success : Colors.secondary,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#111827", fontWeight: "900" }}>{activeMission && solvedMissionIds.includes(activeMission.id) ? "Solved" : "Unlock"}</Text>
                </Pressable>
              </View>
              {quizMessage ? (
                <Text style={{ color: activeMission && solvedMissionIds.includes(activeMission.id) ? "#86efac" : "#fca5a5", fontSize: Font.sm, marginTop: Spacing.sm }}>
                  {quizMessage}
                </Text>
              ) : null}
              <Pressable onPress={() => { setActiveMissionIndex((current) => missionDeck.length ? (current + 1) % missionDeck.length : 0); setPuzzleInput(""); setQuizMessage(null) }} style={{ marginTop: Spacing.sm, alignSelf: "flex-start" }}>
                <Text style={{ color: "#c4b5fd", fontSize: Font.sm, fontWeight: "800" }}>Next mission →</Text>
              </Pressable>
            </View>

            {applied ? (
              <View style={{
                backgroundColor: "#ecfdf5", borderRadius: Radius.lg, padding: Spacing.md,
                borderWidth: 1, borderColor: "#a7f3d0", flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              }}>
                <View>
                  <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.success }}>
                    🎟  {applied.name}
                  </Text>
                  <Text style={{ fontSize: Font.sm, color: Colors.success, marginTop: 2 }}>
                    You save {fmt(applied.discountAmount)}
                  </Text>
                </View>
                <Pressable onPress={() => { setApplied(null); setPromoError(null) }}>
                  <Text style={{ color: Colors.danger, fontWeight: "700" }}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Coupon code input */}
                <View style={{ flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <TextInput
                    value={couponInput}
                    onChangeText={setCouponInput}
                    placeholder="Enter coupon code"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="characters"
                    style={{
                      flex: 1, height: 44, backgroundColor: Colors.bg, borderRadius: Radius.md,
                      paddingHorizontal: Spacing.md, fontSize: Font.md, color: Colors.text,
                      borderWidth: 1, borderColor: Colors.border, letterSpacing: 2,
                    }}
                  />
                  <Pressable
                    onPress={applyCouponCode}
                    disabled={applyingCode || !couponInput.trim()}
                    style={{
                      paddingHorizontal: Spacing.lg, height: 44, borderRadius: Radius.md,
                      backgroundColor: couponInput.trim() ? Colors.primary : Colors.bgMuted,
                      justifyContent: "center",
                    }}
                  >
                    {applyingCode
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: couponInput.trim() ? "#fff" : Colors.textMuted, fontWeight: "700" }}>Apply</Text>}
                  </Pressable>
                </View>

                {/* Available offers */}
                {promoLoading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={{ color: Colors.textSecondary, fontSize: Font.sm }}>Finding best offers…</Text>
                  </View>
                ) : promos.length > 0 ? (
                  <>
                    <Pressable
                      onPress={applyBest}
                      style={{
                        backgroundColor: Colors.primaryLight, borderRadius: Radius.md,
                        paddingVertical: Spacing.md, alignItems: "center", marginBottom: Spacing.md,
                      }}
                    >
                      <Text style={{ color: Colors.primary, fontWeight: "800", fontSize: Font.md }}>
                        ✨ Apply Best Offer, bestie
                      </Text>
                    </Pressable>
                    {promos.map((p) => (
                      <Pressable
                        key={p.campaignId}
                        onPress={() => void applyByCampaign(p.campaignId, p.name, p.code)}
                        style={({ pressed }) => ({
                          flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                          padding: Spacing.md, backgroundColor: pressed ? Colors.bg : Colors.bgCard,
                          borderRadius: Radius.md, marginBottom: Spacing.sm,
                          borderWidth: 1, borderColor: Colors.border,
                        })}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: Font.md, fontWeight: "700", color: Colors.text }}>{p.name}</Text>
                          <Text style={{ fontSize: Font.xs, color: Colors.secondary, marginTop: 3, fontWeight: "800", letterSpacing: 0.6 }}>{promoPersona(p).badge}</Text>
                          {p.code && <Text style={{ fontSize: Font.sm, color: Colors.primary, marginTop: 1 }}>Code: {p.code}</Text>}
                          {p.remainingUses != null && (
                            <Text style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 1 }}>{p.remainingUses} uses left</Text>
                          )}
                          {(p.metadata?.audience || p.daysRemaining != null) && (
                            <Text style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 }}>
                              {p.metadata?.audience ? `Audience: ${String(p.metadata.audience).replace(/_/g, " ")}` : "Live campaign"}
                              {p.daysRemaining != null ? ` · ${p.daysRemaining}d left` : ""}
                            </Text>
                          )}
                          <Text style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 4 }}>
                            {promoPersona(p).copy}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm }}>
                          <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "800" }}>
                            {p.discount?.percentage ? `${p.discount.percentage}% off` : p.discount?.flatAmount ? fmt(p.discount.flatAmount) + " off" : "Apply"}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <Text style={{ color: Colors.textMuted, fontSize: Font.sm, textAlign: "center", paddingVertical: 4 }}>
                      No eligible offers for this cart yet. The coupon lab might still save the day.
                  </Text>
                )}
              </>
            )}
            {promoError && (
              <Text style={{ color: Colors.danger, fontSize: Font.sm, marginTop: Spacing.sm }}>{promoError}</Text>
            )}
          </View>

          {/* Payment Method */}
          <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
            PAYMENT METHOD
          </Text>
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm }}>
            {(["cash_on_delivery", "online"] as const).map((method) => (
              <Pressable
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", padding: Spacing.md,
                  borderRadius: Radius.lg, marginBottom: method === "cash_on_delivery" ? Spacing.sm : 0,
                  borderWidth: 1.5,
                  borderColor: paymentMethod === method ? Colors.primary : Colors.border,
                  backgroundColor: paymentMethod === method ? Colors.primaryLight : Colors.bg,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 24, marginRight: Spacing.md }}>
                  {method === "cash_on_delivery" ? "💵" : "📱"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Font.md, fontWeight: "700", color: Colors.text }}>
                    {method === "cash_on_delivery" ? "Cash on Delivery" : "Online Payment (UPI / Card)"}
                  </Text>
                  <Text style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 }}>
                    {method === "cash_on_delivery" ? "Pay when your order arrives" : "Secure · Instant confirmation"}
                  </Text>
                </View>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2, borderColor: paymentMethod === method ? Colors.primary : Colors.borderDark,
                  backgroundColor: paymentMethod === method ? Colors.primary : "transparent",
                  justifyContent: "center", alignItems: "center",
                }}>
                  {paymentMethod === method && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Bill Summary */}
          <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
            BILL SUMMARY
          </Text>
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: Font.md, color: Colors.textSecondary }}>Subtotal</Text>
              <Text style={{ fontSize: Font.md, color: Colors.text, fontWeight: "600" }}>{fmt(subtotal)}</Text>
            </View>
            {applied && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: Font.md, color: Colors.success }}>Discount</Text>
                <Text style={{ fontSize: Font.md, color: Colors.success, fontWeight: "700" }}>−{fmt(applied.discountAmount)}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: Font.md, color: Colors.textSecondary }}>Delivery</Text>
              <Text style={{ fontSize: Font.sm, color: Colors.success, fontWeight: "700" }}>FREE</Text>
            </View>
            <View style={{
              flexDirection: "row", justifyContent: "space-between",
              paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
            }}>
              <Text style={{ fontSize: Font.lg, fontWeight: "900", color: Colors.text }}>Total</Text>
              <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.primary }}>{fmt(finalTotal)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Sticky Place Order button */}
      {cartItems.length > 0 && (
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: Spacing.xl, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border,
        }}>
          <Pressable
            onPress={placeOrder}
            disabled={placing}
            style={({ pressed }) => ({
              backgroundColor: placing ? Colors.textMuted : Colors.primary,
              borderRadius: Radius.xl, paddingVertical: Spacing.lg,
              alignItems: "center", opacity: pressed ? 0.9 : 1, ...Shadow.lg,
            })}
          >
            {placing ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: Font.md }}>
                  {paymentStep === "creating" ? "Creating payment…" :
                   paymentStep === "processing" ? "Processing payment…" :
                   paymentStep === "verifying" ? "Verifying…" : "Placing order…"}
                </Text>
              </View>
            ) : (
              <Text style={{ color: "#fff", fontSize: Font.lg, fontWeight: "900" }}>
                {paymentMethod === "online" ? "Pay" : "Place Order"} · {fmt(finalTotal)}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  )
}
