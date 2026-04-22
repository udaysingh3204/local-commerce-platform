import API from "../api/api"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => {
      open: () => void
      on: (event: string, handler: (response: any) => void) => void
    }
  }
}

type PaymentFlowInput = {
  orderId: string
  amount: number
  paymentMethod: string
}

type PaymentFlowResult = {
  order?: any
  message: string
  status: "paid" | "pending"
  isMock: boolean
}

type PaymentConfig = {
  provider: string
  key: string
  currency: string
  isMock: boolean
  merchantName: string
  description: string
}

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js"

const extractErrorMessage = (error: any) => error?.response?.data?.message || error?.response?.data?.error || "Payment flow failed"

const ensureRazorpayLoaded = async () => {
  if (window.Razorpay) return

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Razorpay SDK failed to load")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = RAZORPAY_SCRIPT_ID
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"))
    document.body.appendChild(script)
  })
}

export async function runPaymentFlow({ orderId, amount, paymentMethod }: PaymentFlowInput): Promise<PaymentFlowResult> {
  try {
    const [configRes, createRes] = await Promise.all([
      API.get("/payment/config"),
      API.post("/payment/create-order", {
        orderId,
        amount,
        paymentMethod,
      }),
    ])

    const config = configRes.data as PaymentConfig
    const createData = createRes.data
    const draftOrder = createData?.order

    if (config.isMock || createData?.isMock) {
      const verifyRes = await API.post("/payment/verify", {
        orderId,
        paymentMethod,
        isMock: true,
        razorpay_order_id: createData.id,
      })

      return {
        order: verifyRes.data?.order || draftOrder,
        message: "Payment recovered in demo mode.",
        status: "paid",
        isMock: true,
      }
    }

    if (!config.key) {
      throw new Error("Razorpay public key is not configured")
    }

    await ensureRazorpayLoaded()

    const verifiedOrder = await new Promise<any>((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error("Razorpay SDK failed to initialize"))
        return
      }

      const razorpay = new window.Razorpay({
        key: config.key,
        amount: createData.amount,
        currency: createData.currency || config.currency,
        name: config.merchantName,
        description: config.description,
        order_id: createData.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await API.post("/payment/verify", {
              orderId,
              paymentMethod,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })

            resolve(verifyRes.data?.order || draftOrder)
          } catch (error) {
            reject(error)
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await API.post("/payment/fail", {
                orderId,
                paymentMethod,
                reason: "Customer dismissed Razorpay checkout before payment confirmation.",
              })
            } catch {
              // Best effort only.
            }

            reject(new Error("Payment checkout was closed before completion"))
          },
        },
        theme: {
          color: "#7c3aed",
        },
      })

      razorpay.on("payment.failed", async (response: any) => {
        try {
          await API.post("/payment/fail", {
            orderId,
            paymentMethod,
            reason: response?.error?.description || response?.error?.reason || "Razorpay reported a payment failure",
          })
        } catch {
          // Best effort only.
        }

        reject(new Error(response?.error?.description || "Payment failed"))
      })

      razorpay.open()
    })

    return {
      order: verifiedOrder,
      message: "Payment completed successfully.",
      status: "paid",
      isMock: false,
    }
  } catch (error: any) {
    try {
      await API.post("/payment/fail", {
        orderId,
        paymentMethod,
        reason: extractErrorMessage(error),
      })
    } catch {
      // Best effort only; the original error is the one the caller should handle.
    }

    throw error
  }
}