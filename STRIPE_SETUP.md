# Configuração do Stripe — Agenda+Zap

O checkout recorrente foi migrado para Stripe e o plano mensal está configurado no servidor como **R$ 19,90/mês**.

## 1. Secrets no Supabase

Configure estes secrets nas Edge Functions:

- `STRIPE_SECRET_KEY` — chave secreta do Stripe (`sk_...`)
- `STRIPE_WEBHOOK_SECRET` — segredo do endpoint de webhook (`whsec_...`)
- `STRIPE_PRICE_ID` — opcional. Se informado, deve apontar para um preço recorrente mensal de R$ 19,90. Se não for informado, o checkout cria o item recorrente de R$ 19,90 diretamente na sessão.

Os secrets padrão do Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`) também são utilizados.

## 2. Edge Functions

Implante:

```bash
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy delete-account
supabase functions deploy stripe-webhook --no-verify-jwt
```

O webhook precisa ficar sem verificação JWT porque é chamado diretamente pelo Stripe.

## 3. Webhook no Stripe

Crie um endpoint apontando para:

```text
https://SEU-PROJETO.supabase.co/functions/v1/stripe-webhook
```

Eventos necessários:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Depois copie o signing secret (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`.

## 4. Customer Portal

Ative o Stripe Customer Portal no Dashboard do Stripe. O botão **Gerenciar assinatura** usa esse portal para permitir que o cliente gerencie/cancele a assinatura.

## 5. Valor

O frontend exibe **R$ 19,90/mês** e a Edge Function `create-checkout` também força **1990 centavos** no servidor quando `STRIPE_PRICE_ID` não é informado.

## 6. Remover a função antiga da InfinitePay (opcional)

Se ela ainda estiver publicada no seu projeto Supabase, pode remover depois de validar o Stripe:

```bash
supabase functions delete infinitepay-webhook
```
