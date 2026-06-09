import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Target, Info, DollarSign, Scale } from "lucide-react"
import Link from "next/link"
import { STAGE_LABELS } from "@/types/domain"

interface Props { params: Promise<{ token: string }> }

export default async function RulesPage({ params }: Props) {
  const { token } = await params

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <div>
          <h1 className="font-bold">Regras &amp; Premiação</h1>
          <p className="text-green-300 text-xs">Bolão Copa 2026</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Premiação */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              Premiação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <p className="text-sm text-muted-foreground">
              Cada participante contribui <strong>R$ 30,00</strong>. O prêmio total é dividido entre os três primeiros:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-yellow-100 dark:bg-yellow-900/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥇</span>
                  <div>
                    <div className="font-semibold text-sm">1º Lugar</div>
                    <div className="text-xs text-muted-foreground">60% do prêmio total</div>
                  </div>
                </div>
                <Badge variant="warning" className="text-base font-bold px-3 py-1">60%</Badge>
              </div>
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥈</span>
                  <div>
                    <div className="font-semibold text-sm">2º Lugar</div>
                    <div className="text-xs text-muted-foreground">25% do prêmio total</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-base font-bold px-3 py-1">25%</Badge>
              </div>
              <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥉</span>
                  <div>
                    <div className="font-semibold text-sm">3º Lugar</div>
                    <div className="text-xs text-muted-foreground">15% do prêmio total</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-base font-bold px-3 py-1">15%</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Exemplo com 20 participantes: prêmio total = R$ 600 → 1º R$ 360 / 2º R$ 150 / 3º R$ 90
            </p>
          </CardContent>
        </Card>

        {/* Pontuação Fase de Grupos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              Pontuação — Fase de Grupos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="text-sm font-medium">Placar exato</div>
                  <div className="text-xs text-muted-foreground">Ex: você previu 2×1, resultado foi 2×1</div>
                </div>
                <Badge className="bg-green-600 text-white text-sm font-bold px-3">5 pts</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="text-sm font-medium">Vencedor ou empate correto</div>
                  <div className="text-xs text-muted-foreground">Ex: previu 1×0, resultado foi 3×1 (mesmo vencedor)</div>
                </div>
                <Badge variant="secondary" className="text-sm font-bold px-3">3 pts</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="text-sm font-medium">+ Saldo de gols correto</div>
                  <div className="text-xs text-muted-foreground">Ex: previu 2×0 (+2), resultado 3×1 (+2)</div>
                </div>
                <Badge variant="outline" className="text-sm font-bold px-3">+1 pt</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">Resultado errado</div>
                  <div className="text-xs text-muted-foreground">Previu vitória, deu empate ou derrota</div>
                </div>
                <Badge variant="secondary" className="text-sm font-bold px-3">0 pts</Badge>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium">Exemplos:</p>
              <p>Resultado <strong>3×1</strong>, Palpite <strong>3×1</strong> → <strong className="text-green-600">5 pts</strong> (placar exato)</p>
              <p>Resultado <strong>3×1</strong>, Palpite <strong>2×0</strong> → <strong className="text-green-600">4 pts</strong> (vencedor + saldo +2)</p>
              <p>Resultado <strong>3×1</strong>, Palpite <strong>1×0</strong> → <strong className="text-green-600">3 pts</strong> (vencedor certo)</p>
              <p>Resultado <strong>3×1</strong>, Palpite <strong>0×1</strong> → <strong className="text-muted-foreground">0 pts</strong></p>
            </div>
          </CardContent>
        </Card>

        {/* Pontuação Mata-Mata */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Pontuação — Mata-Mata
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-2">Fase</th>
                  <th className="text-center py-2">Placar exato</th>
                  <th className="text-center py-2">Classificado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 font-medium">{STAGE_LABELS.R32}</td>
                  <td className="text-center py-2"><Badge className="bg-green-600 text-white">6 pts</Badge></td>
                  <td className="text-center py-2"><Badge variant="secondary">4 pts</Badge></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">{STAGE_LABELS.R16}</td>
                  <td className="text-center py-2"><Badge className="bg-green-600 text-white">8 pts</Badge></td>
                  <td className="text-center py-2"><Badge variant="secondary">5 pts</Badge></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">{STAGE_LABELS.QF}</td>
                  <td className="text-center py-2"><Badge className="bg-green-600 text-white">10 pts</Badge></td>
                  <td className="text-center py-2"><Badge variant="secondary">6 pts</Badge></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">{STAGE_LABELS.SF}</td>
                  <td className="text-center py-2"><Badge className="bg-green-600 text-white">12 pts</Badge></td>
                  <td className="text-center py-2"><Badge variant="secondary">7 pts</Badge></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">{STAGE_LABELS["3RD"]}</td>
                  <td className="text-center py-2"><Badge className="bg-green-600 text-white">10 pts</Badge></td>
                  <td className="text-center py-2"><Badge variant="secondary">6 pts</Badge></td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2">{STAGE_LABELS.FINAL} 🏆</td>
                  <td className="text-center py-2"><Badge className="bg-yellow-500 text-white">20 pts</Badge></td>
                  <td className="text-center py-2"><Badge className="bg-yellow-100 text-yellow-800">12 pts</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Prazos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4" />
              Prazos dos Palpites
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div className="flex items-start gap-3 py-1.5 border-b">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <div>
                <div className="font-medium">Rodada 1 da Fase de Grupos</div>
                <div className="text-xs text-muted-foreground">Aberta desde o início · Fecha 15 min antes do 1° jogo (11/06 às 16h)</div>
              </div>
            </div>
            <div className="flex items-start gap-3 py-1.5 border-b">
              <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
              <div>
                <div className="font-medium">Rodada 2 da Fase de Grupos</div>
                <div className="text-xs text-muted-foreground">Aberta desde o início · Fecha 15 min antes do 1° jogo da Rodada 2</div>
              </div>
            </div>
            <div className="flex items-start gap-3 py-1.5 border-b">
              <div className="w-2 h-2 rounded-full bg-green-300 mt-1.5 shrink-0" />
              <div>
                <div className="font-medium">Rodada 3 da Fase de Grupos</div>
                <div className="text-xs text-muted-foreground">Aberta desde o início · <strong>Fecha junto com a Rodada 2</strong> (15 min antes do 1° jogo da Rodada 2)</div>
              </div>
            </div>
            <div className="flex items-start gap-3 py-1.5 border-b">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div>
                <div className="font-medium">16 avos de Final</div>
                <div className="text-xs text-muted-foreground">Abre após o encerramento da Fase de Grupos · Fecha 15 min antes do 1° jogo (28/06)</div>
              </div>
            </div>
            <div className="flex items-start gap-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
              <div>
                <div className="font-medium">Oitavas → Final</div>
                <div className="text-xs text-muted-foreground">Cada fase abre após a anterior encerrar · Fecha 15 min antes do 1° jogo da fase</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critério de Desempate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-500" />
              Critério de Desempate
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <p className="text-xs text-muted-foreground pb-1">
              Em caso de empate na pontuação total, os participantes são separados na seguinte ordem:
            </p>
            <div className="flex items-start gap-3 py-2 border-b">
              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <div className="font-medium">Maior número de placares exatos</div>
                <div className="text-xs text-muted-foreground">Quem acertou mais vezes o placar certinho (ex: 2×1) leva a melhor.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <div className="font-medium">Maior pontuação no mata-mata</div>
                <div className="text-xs text-muted-foreground">Somam-se apenas os pontos obtidos a partir dos 16 avos de final em diante.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="w-full">
          <Link href={`/p/${token}`}>← Voltar ao Dashboard</Link>
        </Button>
      </div>
    </main>
  )
}
