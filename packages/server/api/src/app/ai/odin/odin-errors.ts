import { RoutingDecision, SafetyReport } from './odin-types'

export class OdinSafetyError extends Error {
    public readonly stage: 'input' | 'output'
    public readonly report: SafetyReport
    public readonly decision: RoutingDecision | null
    public readonly inputSafety: SafetyReport | null
    public readonly usage: { inputTokens: number, outputTokens: number, totalTokens: number } | null

    constructor({
        stage,
        report,
        decision,
        inputSafety,
        usage,
    }: {
        stage: 'input' | 'output'
        report: SafetyReport
        decision?: RoutingDecision | null
        inputSafety?: SafetyReport | null
        usage?: { inputTokens: number, outputTokens: number, totalTokens: number } | null
    }) {
        super(`Odin safety blocked the ${stage}. ${report.findings.length} finding(s).`)
        this.name = 'OdinSafetyError'
        this.stage = stage
        this.report = report
        this.decision = decision ?? null
        this.inputSafety = inputSafety ?? null
        this.usage = usage ?? null
    }
}
