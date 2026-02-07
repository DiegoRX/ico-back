export interface Env {
	BINANCE_API_KEY: string;
	BINANCE_SECRET_KEY: string;
	INTERNAL_API_KEY: string;
	WEBHOOK_URL?: string;
	RETURN_URL?: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// CORS headers
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
				}
			});
		}

		// Solo permitir POST
		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		// Verificar API key interna
		const apiKey = request.headers.get('X-API-Key');
		if (apiKey !== env.INTERNAL_API_KEY) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		try {
			const body = await request.json() as {
				amount: string;
				currency: string;
				description?: string;
				merchantTradeNo?: string;
			};

			const { amount, currency, description, merchantTradeNo } = body;

			// Validaciones
			if (!amount || !currency) {
				return new Response(JSON.stringify({ error: 'Amount and currency required' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			const timestamp = Date.now().toString();
			const nonce = crypto.randomUUID().replace(/-/g, '');

			interface BinancePayload {
				env: { terminalType: string };
				merchantTradeNo: string;
				orderAmount: string;
				currency: string;
				goods: {
					goodsType: string;
					goodsCategory: string;
					referenceGoodsId: string;
					goodsName: string;
					goodsDetail: string;
				};
			}

			const payload: BinancePayload = {
				env: { terminalType: 'WEB' },
				merchantTradeNo: merchantTradeNo || `ORDER_${timestamp}`,
				orderAmount: amount.toString(),
				currency: currency.toUpperCase(),
				goods: {
					goodsType: '01',
					goodsCategory: 'Z000',
					referenceGoodsId: 'USDT_PURCHASE',
					goodsName: description?.slice(0, 256) || 'USDT Purchase',
					goodsDetail: description?.slice(0, 512) || 'Purchase of USDT via Binance Pay'
				}
			};

			// V2 does not support webhookUrl in payload body typically, or it is different.
			// We rely on Dashboard settings or different mechanism?
			// For now, let's get ORDER creation working.

			const payloadString = JSON.stringify(payload);
			const signatureString = timestamp + '\n' + nonce + '\n' + payloadString + '\n';

			// HMAC-SHA512
			const encoder = new TextEncoder();
			const key = await crypto.subtle.importKey(
				'raw',
				encoder.encode(env.BINANCE_SECRET_KEY),
				{ name: 'HMAC', hash: 'SHA-512' },
				false,
				['sign']
			);

			const signatureBuffer = await crypto.subtle.sign(
				'HMAC',
				key,
				encoder.encode(signatureString)
			);

			const signature = Array.from(new Uint8Array(signatureBuffer))
				.map(b => b.toString(16).padStart(2, '0'))
				.join('')
				.toUpperCase();

			// Llamar a Binance Pay API v2
			// console.log('Sending payload to Binance (v2):', payloadString);

			const binanceResponse = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v2/order', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'BinancePay-Timestamp': timestamp,
					'BinancePay-Nonce': nonce,
					'BinancePay-Certificate-SN': env.BINANCE_API_KEY,
					'BinancePay-Signature': signature
				},
				body: payloadString
			});

			const data = await binanceResponse.json();

			return new Response(JSON.stringify(data), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});

		} catch (error: any) {
			return new Response(JSON.stringify({
				error: 'Internal error',
				message: error.message
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}
};