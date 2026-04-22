import { useEffect, useState } from "react"
import { useCart } from "../context/CartContext"
import API from "../api/api"
import { useAuth } from "../context/useAuth"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "sonner"
import { runPaymentFlow } from "../lib/paymentFlow"

const DEFAULT_CUSTOMER_LOCATION = { lat: 28.6139, lng: 77.2090 }

type CartItem = {
  _id: string
  name?: string
  price: number
  quantity: number
  storeId?: string
  image?: string
  category?: string
}

type Promotion = {
  campaignId: string
  code?: string | null
  name: string
  type: string
  metadata?: {
    audience?: string
    source?: string
    vibe?: string
    quiz?: {
      prompt?: string
      answer?: string
    }
  }
  daysRemaining?: number | null
  budgetProgress?: number | null
  usedCount?: number
  maxUsagePerUser?: number
  remainingUses?: number | null
  discount?: {
    percentage?: number
    flatAmount?: number
  }
}

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

type SavedAddress = {
  _id: string
  label: string
  fullName: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

const PAYMENT_OPTIONS = [
  { id: "cod", icon: "💵", label: "Cash on Delivery", sub: "Pay when you receive" },
  { id: "upi", icon: "📱", label: "UPI / PhonePe", sub: "Pay instantly with UPI" },
]

const LABEL_ICON: Record<string, string> = { home: "🏠", work: "💼", other: "📍" }
const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "")
const audienceSignal = (promo?: Promotion | null) =>
  String(promo?.metadata?.audience ?? promo?.metadata?.source ?? promo?.type ?? "all").replace(/[_\s]+/g, " ").trim()
const titleSignal = (promo?: Promotion | null) =>
  (promo?.name ?? "").replace(/[^a-z0-9]/gi, "").length || 0
const campaignPrompt = (promo?: Promotion | null, fallback?: string) =>
  promo?.metadata?.quiz?.prompt?.trim() || fallback || "Decode this campaign"
const campaignAnswer = (promo?: Promotion | null, fallback?: string) =>
  promo?.metadata?.quiz?.answer?.trim() || fallback || ""

export default function Checkout() {
  const { cart, clearCart } = useCart()
  const { user, authReady } = useAuth()
  const navigate = useNavigate()

  const [payMethod, setPayMethod] = useState("cod")
  const [address] = useState({ line: "", city: "Noida", pincode: "" })
  const [loading, setLoading] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [locationHint, setLocationHint] = useState("Use your current location for more accurate live ETA after checkout.")
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoCodeInput, setPromoCodeInput] = useState("")
  const [applyingCode, setApplyingCode] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<{ campaignId: string; code?: string | null; name: string; discountAmount: number; remainingUses?: number | null } | null>(null)
  const [puzzleInput, setPuzzleInput] = useState("")
  const [activeMissionIndex, setActiveMissionIndex] = useState(0)
  const [solvedMissionIds, setSolvedMissionIds] = useState<string[]>([])
  const [quizMessage, setQuizMessage] = useState<string | null>(null)

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: "home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" })
  const [savingAddr, setSavingAddr] = useState(false)

  const selectedAddress = savedAddresses.find(a => a._id === selectedAddressId)

  useEffect(() => {
    const loadAddresses = async () => {
      if (!user?._id) return
      try {
        const res = await API.get("/addresses")
        const addrs: SavedAddress[] = Array.isArray(res.data) ? res.data : []
        setSavedAddresses(addrs)
        const def = addrs.find(a => a.isDefault) || addrs[0]
        if (def) setSelectedAddressId(def._id)
      } catch { /* ignore */ }
    }
    void loadAddresses()
  }, [user?._id])

  const saveNewAddress = async () => {
    if (!newAddr.fullName || !newAddr.phone || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode) {
      toast.error("Fill all required address fields")
      return
    }
    setSavingAddr(true)
    try {
      const res = await API.post("/addresses", { ...newAddr, isDefault: savedAddresses.length === 0 })
      const saved: SavedAddress = res.data
      setSavedAddresses(prev => [...prev, saved])
      setSelectedAddressId(saved._id)
      setShowAddressForm(false)
      setNewAddr({ label: "home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" })
      toast.success("Address saved!")
    } catch {
      toast.error("Failed to save address")
    } finally { setSavingAddr(false) }
  }

  const subtotal = cart.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0)
  const deliveryFee = 0
  const promoDiscount = appliedPromo?.discountAmount || 0
  const finalTotal = Math.max(0, subtotal + deliveryFee - promoDiscount)
  const totalUnits = cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)

  const missionDeck = (() => {
    const bestPromo = [...promotions]
      .map((promo) => ({ promo, estimate: promo.discount?.flatAmount || Math.floor((subtotal * (promo.discount?.percentage || 0)) / 100) }))
      .sort((a, b) => b.estimate - a.estimate)[0]?.promo ?? promotions[0] ?? null
    const secondPromo = promotions.find((promo) => promo.campaignId !== bestPromo?.campaignId) ?? bestPromo
    const subtotalDigit = Math.abs(Math.round(subtotal)) % 10
    const featuredCode = bestPromo?.code ?? secondPromo?.code ?? null
    const featuredAudience = audienceSignal(bestPromo)

    const missions: PuzzleMission[] = [
      {
        id: `audience-${bestPromo?.campaignId ?? "fallback"}`,
        badge: bestPromo?.metadata?.source ? `${bestPromo.metadata.source} drop` : "Campaign read",
        title: bestPromo?.name ? `${bestPromo.name} signal check` : "Campaign signal check",
        prompt: bestPromo
          ? campaignPrompt(bestPromo, `This live campaign is aimed at which audience tag: ${featuredAudience}, local hype, or midnight rush?`)
          : `What is ${cart.length} + ${Math.max(totalUnits, 1)} + ${subtotalDigit}?`,
        answer: bestPromo
          ? campaignAnswer(bestPromo, featuredAudience)
          : String(cart.length + Math.max(totalUnits, 1) + subtotalDigit),
        rewardText: bestPromo?.name ? `Unlock ${bestPromo.name}` : "Unlock the best live offer",
        rewardCode: bestPromo?.code ?? null,
        rewardCampaignId: bestPromo?.campaignId ?? null,
      },
      {
        id: `title-${secondPromo?.campaignId ?? featuredCode ?? "fallback"}`,
        badge: secondPromo?.metadata?.vibe ?? "Campaign decoder",
        title: secondPromo?.name ? `${secondPromo.name} checksum` : "Coupon decoder",
        prompt: secondPromo?.name
          ? campaignPrompt(secondPromo, `How many letters and digits are in the live campaign title ${secondPromo.name}?`)
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
        id: `window-${bestPromo?.campaignId ?? "store"}-${totalUnits}`,
        badge: "Expiry radar",
        title: bestPromo?.daysRemaining != null ? "Campaign window" : "Crew energy multiplier",
        prompt: bestPromo?.daysRemaining != null
          ? `How many days are left on the hottest live campaign: ${bestPromo.daysRemaining}, ${bestPromo.daysRemaining + 3}, or ${Math.max(bestPromo.daysRemaining - 2, 0)}?`
          : `If your ${cart.length} cart lines each drop ${Math.max(totalUnits, 2)} hype points, what's the total?`,
        answer: bestPromo?.daysRemaining != null ? String(bestPromo.daysRemaining) : String(cart.length * Math.max(totalUnits, 2)),
        rewardText: featuredCode ? `Autofill ${featuredCode}` : "Autofill the loudest promo we have",
        rewardCode: featuredCode,
        rewardCampaignId: bestPromo?.campaignId ?? null,
      },
    ]

    return missions
  })()
  const activeMission = missionDeck[activeMissionIndex] ?? null

  const captureCustomerLocation = async () => {
    if (!("geolocation" in navigator)) {
      setLocationHint("Location is unavailable in this browser. Using your delivery city for ETA fallback.")
      return DEFAULT_CUSTOMER_LOCATION
    }

    return new Promise<{ lat: number; lng: number }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationHint("Current location captured. Live ETA will use your actual delivery point.")
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          setLocationHint("Location permission was skipped. Live ETA will use a city-level fallback until you allow GPS.")
          resolve(DEFAULT_CUSTOMER_LOCATION)
        },
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 60000,
        }
      )
    })
  }

  const fetchAvailablePromotions = async (): Promise<Promotion[]> => {
    if (!user?._id || !cart.length) {
      setPromotions([])
      return []
    }

    setPromoLoading(true)
    setPromoError(null)

    try {
      const payloadProducts = cart.map((item: CartItem) => ({
        productId: item._id,
        category: item.category || "general",
        quantity: item.quantity,
      }))

      const res = await API.get("/promotions/available/for-order", {
        params: {
          products: JSON.stringify(payloadProducts),
          totalAmount: subtotal,
          storeId: (cart[0] as CartItem)?.storeId,
        },
      })

      const fetchedPromotions = res.data.promotions || []
      setPromotions(fetchedPromotions)
      return fetchedPromotions as Promotion[]
    } catch (error: any) {
      setPromoError(error?.response?.data?.error || "Unable to load promotions right now")
      setPromotions([])
      return [] as Promotion[]
    } finally {
      setPromoLoading(false)
    }
  }

  const applyPromotion = async (campaignId: string, campaignName: string) => {
    try {
      const orderPreview = {
        subtotal,
        items: cart.map((item: CartItem) => ({
          productId: item._id,
          quantity: item.quantity,
          price: item.price,
        })),
      }

      const res = await API.post(`/promotions/${campaignId}/apply`, {
        order: orderPreview,
      })

      const discountAmount = Number(res.data.discountAmount || 0)
      setAppliedPromo({
        campaignId,
        code: res.data.couponCode || null,
        name: res.data.campaignName || campaignName,
        discountAmount,
        remainingUses: res.data.remainingUses,
      })
      toast.success(res.data.message || `Offer applied: saved ₹${discountAmount}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to apply this promotion")
    }
  }

  const applyCouponCode = async () => {
    const code = promoCodeInput.trim()
    if (!code) {
      toast.error("Enter a coupon code")
      return
    }

    setApplyingCode(true)
    try {
      const orderPreview = {
        subtotal,
        items: cart.map((item: CartItem) => ({
          productId: item._id,
          quantity: item.quantity,
          price: item.price,
        })),
      }

      const res = await API.post(`/promotions/code/${encodeURIComponent(code)}/apply`, {
        order: orderPreview,
      })

      const discountAmount = Number(res.data.discountAmount || 0)
      setAppliedPromo({
        campaignId: res.data.campaignId,
        code: res.data.couponCode || code.toUpperCase(),
        name: res.data.campaignName || "Coupon Offer",
        discountAmount,
        remainingUses: res.data.remainingUses,
      })
      toast.success(res.data.message || `Coupon applied: saved ₹${discountAmount}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Invalid or inactive coupon code")
    } finally {
      setApplyingCode(false)
    }
  }

  const applyBestPromotion = async () => {
    const list = promotions.length > 0 ? promotions : await fetchAvailablePromotions()
    if (list.length === 0) {
      toast.info("No promotions are available for this cart yet")
      return
    }

    const ranked = [...list].sort((a, b) => {
      const aEstimate = a.discount?.flatAmount || Math.floor((subtotal * (a.discount?.percentage || 0)) / 100)
      const bEstimate = b.discount?.flatAmount || Math.floor((subtotal * (b.discount?.percentage || 0)) / 100)
      return bEstimate - aEstimate
    })

    const best = ranked[0]
    await applyPromotion(best.campaignId, best.name)
  }

  const removePromotion = () => {
    setAppliedPromo(null)
    setPromoCodeInput("")
    toast.success("Promotion removed")
  }

  const unlockQuizOffer = async () => {
    if (!activeMission) return
    if (normalizeAnswer(puzzleInput) !== normalizeAnswer(activeMission.answer)) {
      setQuizMessage("Nope. Brain lag detected. Try again.")
      return
    }

    setSolvedMissionIds((current) => current.includes(activeMission.id) ? current : [...current, activeMission.id])
    const rewardPromo = promotions.find((promo) => promo.campaignId === activeMission.rewardCampaignId)

    if (rewardPromo) {
      await applyPromotion(rewardPromo.campaignId, rewardPromo.name)
      setQuizMessage(`Main character behavior. ${rewardPromo.name} just landed on your cart.`)
      return
    }

    if (activeMission.rewardCode) {
      setPromoCodeInput(activeMission.rewardCode)
      setQuizMessage(`Secret drop unlocked: ${activeMission.rewardCode}`)
      return
    }

    setQuizMessage("Brain buff unlocked. Hit auto-apply for the hidden sauce.")
  }

  useEffect(() => {
    if (!user?._id || !cart.length) {
      setPromotions([])
      setAppliedPromo(null)
      return
    }

    void fetchAvailablePromotions()
  }, [user?._id, cart.length, subtotal])

  useEffect(() => {
    setActiveMissionIndex((current) => (missionDeck.length ? Math.min(current, missionDeck.length - 1) : 0))
    setPuzzleInput("")
    setQuizMessage(null)
  }, [missionDeck.length, subtotal, cart.length, totalUnits])

  const placeOrder = async () => {
    if (!cart.length) return toast.error("Your cart is empty")
    if (!user?._id) { toast.error("Please log in"); navigate("/login"); return }
    if (!selectedAddress && !address.line) { toast.error("Please add a delivery address"); return }
    setLoading(true)
    try {
      const customerLocation = await captureCustomerLocation()
      const deliveryAddress = selectedAddress
        ? { line: `${selectedAddress.line1}${selectedAddress.line2 ? ", " + selectedAddress.line2 : ""}`, city: selectedAddress.city, pincode: selectedAddress.pincode }
        : address
      const res = await API.post("/orders", {
        customerId: user._id,
        storeId: (cart[0] as CartItem)?.storeId,
        items: cart.map((i: CartItem) => ({ productId: i._id, quantity: i.quantity })),
        totalAmount: finalTotal,
        paymentMethod: payMethod,
        customerLocation,
        deliveryAddress,
        promotion: appliedPromo,
      })

      if (payMethod !== "cod") {
        const paymentResult = await runPaymentFlow({
          orderId: res.data.order._id,
          amount: finalTotal,
          paymentMethod: payMethod,
        })

        if (paymentResult.status === "paid") {
          toast.success(paymentResult.message)
        } else {
          toast.info(paymentResult.message)
        }
      }

      setPlaced(true)
      clearCart()
      toast.success("🎉 Order placed successfully!")
      setTimeout(() => navigate(`/track/${res.data.order._id}`), 1600)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || "Order failed — please try again")
    } finally {
      setLoading(false)
    }
  }

  /* ── Success State ── */
  if (placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-sm w-full p-10 text-center ca-bounce-in">
          <div className="text-7xl mb-5">🎉</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-500 text-sm">Redirecting you to live tracking...</p>
          <div className="mt-6 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-violet-600 to-pink-500 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    )
  }

  /* ── Login Guard ── */
  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-400/30 border-t-violet-400 rounded-full ca-spin-slow mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Preparing checkout...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-sm w-full p-10 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Login required</h2>
          <p className="text-gray-500 text-sm mb-6">Please sign in to place your order.</p>
          <Link to="/login" className="inline-block bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all">
            Sign In →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-linear-to-r from-violet-900 via-violet-800 to-fuchsia-900 text-white px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/cart" className="text-violet-300 hover:text-white text-sm font-medium transition">← Back to cart</Link>
            <span className="text-violet-600">·</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="text-base">🔒</span> 100% Secure Checkout
            </span>
          </div>
          <h1 className="text-3xl font-black">Checkout</h1>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {["Cart", "Review", "Track"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${i === 1 ? "bg-white text-violet-700" : "bg-white/10 text-white/50"}`}>
                  <span>{i === 0 ? "✓" : i + 1}</span> {s}
                </div>
                {i < 2 && <div className="w-4 h-0.5 bg-white/20 rounded-full" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="text-7xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Your cart is empty</h2>
          <Link to="/" className="inline-block bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all">
            Browse Stores →
          </Link>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-5 gap-8">

          {/* ── LEFT: ORDER SUMMARY ── */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-lg font-black text-gray-900">Order Summary</h2>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {cart.map((item: CartItem) => (
                <div key={item._id} className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-xl bg-linear-to-br from-violet-100 to-pink-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" /> : "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">{item.name ?? "Item"}</h4>
                    <p className="text-gray-500 text-xs mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-black text-violet-700 text-sm shrink-0">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2"><span>📍</span> Delivery Address</h3>
                <button onClick={() => setShowAddressForm(s => !s)} className="text-xs font-bold text-violet-600 hover:text-violet-800">
                  + New Address
                </button>
              </div>

              {/* Saved address picker */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2 mb-4">
                  {savedAddresses.map(addr => (
                    <button
                      key={addr._id}
                      onClick={() => setSelectedAddressId(addr._id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedAddressId === addr._id ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{LABEL_ICON[addr.label] ?? "📍"}</span>
                        <span className="text-xs font-bold uppercase text-gray-500">{addr.label}</span>
                        {addr.isDefault && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Default</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{addr.fullName} · {addr.phone}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} — {addr.pincode}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* New address form */}
              {(showAddressForm || savedAddresses.length === 0) && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex gap-2 flex-wrap">
                    {["home", "work", "other"].map(l => (
                      <button key={l} onClick={() => setNewAddr(a => ({ ...a, label: l }))}
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${newAddr.label === l ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-500 border-gray-200"}`}>
                        {LABEL_ICON[l]} {l}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "fullName", label: "Full Name*", placeholder: "John Doe" },
                      { key: "phone", label: "Phone*", placeholder: "9876543210" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] font-bold uppercase text-gray-400">{f.label}</label>
                        <input value={(newAddr as any)[f.key]} onChange={e => setNewAddr(a => ({ ...a, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">Street / Flat*</label>
                    <input value={newAddr.line1} onChange={e => setNewAddr(a => ({ ...a, line1: e.target.value }))}
                      placeholder="Block A, Sector 18, Flat 204"
                      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "city", label: "City*", placeholder: "Noida" },
                      { key: "state", label: "State*", placeholder: "UP" },
                      { key: "pincode", label: "Pincode*", placeholder: "201301" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] font-bold uppercase text-gray-400">{f.label}</label>
                        <input value={(newAddr as any)[f.key]} onChange={e => setNewAddr(a => ({ ...a, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                      </div>
                    ))}
                  </div>
                  <button onClick={saveNewAddress} disabled={savingAddr}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition">
                    {savingAddr ? "Saving…" : "Save Address"}
                  </button>
                </div>
              )}

              <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                {locationHint}
              </p>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
                <span>💳</span> Payment Method
              </h3>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPayMethod(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      payMethod === opt.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${payMethod === opt.id ? "text-violet-700" : "text-gray-900"}`}>{opt.label}</p>
                      <p className="text-gray-500 text-xs">{opt.sub}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${payMethod === opt.id ? "border-violet-500" : "border-gray-300"}`}>
                      {payMethod === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: PRICE + CTA ── */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-gray-900">Price Breakdown</h2>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
              {/* Account row */}
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl mb-5">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-pink-400 flex items-center justify-center text-white text-base font-black shrink-0">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                  <p className="text-gray-500 text-xs truncate">{user.email}</p>
                </div>
              </div>

              {/* Price rows */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} item{cart.length > 1 ? "s" : ""})</span>
                  <span className="font-semibold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform fee</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Promotion discount</span>
                  <span className="font-semibold text-emerald-600">-₹{promoDiscount}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between font-black text-gray-900 text-base">
                  <span>Total</span>
                  <span className="text-violet-700">₹{finalTotal}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-violet-900">Offers and Coupons</h4>
                  <button
                    type="button"
                    onClick={fetchAvailablePromotions}
                    disabled={promoLoading}
                    className="text-xs font-bold text-violet-700 hover:text-violet-900 disabled:opacity-60"
                  >
                    {promoLoading ? "Checking..." : "Refresh offers"}
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-violet-200 bg-linear-to-br from-slate-950 via-violet-950 to-slate-900 p-4 text-white">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-200">Chaos coupon lab</p>
                  <h5 className="mt-2 text-lg font-black">Campaign-backed quiz missions are live on web too.</h5>
                  <p className="mt-2 text-xs leading-5 text-violet-100/85">
                    This deck now reads actual campaign metadata. Crack a mission and either auto-drop the best promo or surface the right code.
                  </p>

                  <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                    {missionDeck.map((mission, index) => {
                      const solved = solvedMissionIds.includes(mission.id)
                      const active = index === activeMissionIndex
                      return (
                        <button
                          key={mission.id}
                          type="button"
                          onClick={() => { setActiveMissionIndex(index); setPuzzleInput(""); setQuizMessage(null) }}
                          className={`min-w-[180px] rounded-2xl border px-4 py-3 text-left transition ${solved ? "border-emerald-300 bg-emerald-400/10" : active ? "border-sky-300 bg-sky-400/10" : "border-white/15 bg-white/5"}`}
                        >
                          <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${solved ? "text-emerald-200" : "text-sky-200"}`}>{mission.badge}</p>
                          <p className="mt-2 text-sm font-black text-white">{mission.title}</p>
                          <p className="mt-2 text-xs leading-5 text-violet-100/80">{mission.rewardText}</p>
                          <p className={`mt-3 text-[11px] font-black uppercase tracking-[0.16em] ${solved ? "text-emerald-200" : "text-amber-200"}`}>{solved ? "Unlocked" : active ? "Live now" : "Tap to play"}</p>
                        </button>
                      )
                    })}
                  </div>

                  {activeMission && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">{activeMission.badge}</p>
                      <p className="mt-2 text-sm font-black text-white">{activeMission.title}</p>
                      <p className="mt-2 text-sm leading-6 text-violet-100/85">{activeMission.prompt}</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={puzzleInput}
                      onChange={(event) => setPuzzleInput(event.target.value)}
                      placeholder="Your answer"
                      className={`min-w-0 flex-1 rounded-xl border bg-slate-950/55 px-3 py-2 text-sm font-bold text-white placeholder:text-slate-400 focus:outline-none ${activeMission && solvedMissionIds.includes(activeMission.id) ? "border-emerald-400" : "border-white/15 focus:border-sky-300"}`}
                    />
                    <button
                      type="button"
                      onClick={() => void unlockQuizOffer()}
                      className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${activeMission && solvedMissionIds.includes(activeMission.id) ? "bg-emerald-300 text-emerald-950" : "bg-sky-300 text-slate-950"}`}
                    >
                      {activeMission && solvedMissionIds.includes(activeMission.id) ? "Solved" : "Unlock"}
                    </button>
                  </div>

                  {quizMessage && (
                    <p className={`mt-3 text-xs font-semibold ${activeMission && solvedMissionIds.includes(activeMission.id) ? "text-emerald-200" : "text-rose-200"}`}>{quizMessage}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => { setActiveMissionIndex((current) => missionDeck.length ? (current + 1) % missionDeck.length : 0); setPuzzleInput(""); setQuizMessage(null) }}
                    className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-violet-200 hover:text-white"
                  >
                    Next mission →
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(event) => setPromoCodeInput(event.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold tracking-wide text-violet-900 focus:border-violet-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCouponCode()}
                    disabled={applyingCode}
                    className="rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
                  >
                    {applyingCode ? "Applying..." : "Apply code"}
                  </button>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={applyBestPromotion}
                    className="rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800"
                  >
                    Auto-apply best offer
                  </button>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={removePromotion}
                      className="rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {appliedPromo && (
                  <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
                    Applied: {appliedPromo.name}{appliedPromo.code ? ` (${appliedPromo.code})` : ""} (saved ₹{appliedPromo.discountAmount}){typeof appliedPromo.remainingUses === "number" ? ` · ${appliedPromo.remainingUses} use(s) left` : ""}
                  </p>
                )}

                {promoError && (
                  <p className="mt-3 rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700">{promoError}</p>
                )}

                {!promoLoading && promotions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {promotions.slice(0, 3).map((promo) => {
                      const estimate = promo.discount?.flatAmount || Math.floor((subtotal * (promo.discount?.percentage || 0)) / 100)
                      return (
                        <div key={promo.campaignId} className="flex items-center justify-between rounded-xl border border-violet-200 bg-white px-3 py-2">
                          <div>
                            <p className="text-xs font-bold text-violet-900">{promo.name}</p>
                            <p className="text-[11px] text-violet-700">Estimated save ₹{estimate}{promo.code ? ` · ${promo.code}` : ""}{typeof promo.remainingUses === "number" ? ` · ${promo.remainingUses} left` : ""}</p>
                            {(promo.metadata?.audience || promo.daysRemaining != null) && (
                              <p className="text-[11px] text-gray-500">{promo.metadata?.audience ? `Audience: ${String(promo.metadata.audience).replace(/_/g, " ")}` : "Live campaign"}{promo.daysRemaining != null ? ` · ${promo.daysRemaining}d left` : ""}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void applyPromotion(promo.campaignId, promo.name)}
                            className="rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-800 hover:bg-violet-200"
                          >
                            Apply
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={placeOrder}
                disabled={loading || !cart.length}
                className="mt-5 w-full bg-linear-to-r from-violet-600 to-pink-500 text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full ca-spin-slow" />
                    Placing order...
                  </span>
                ) : (
                  `🚀 Place Order — ₹${finalTotal}`
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {["🔒 Secure", "⚡ Fast", "🎉 Easy returns"].map(b => (
                  <div key={b} className="bg-gray-50 rounded-xl py-2 text-xs font-semibold text-gray-500">{b}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
