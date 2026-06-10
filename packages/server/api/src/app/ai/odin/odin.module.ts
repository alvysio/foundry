import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { odinController } from './odin-controller'

export const odinModule: FastifyPluginAsyncZod = async (app) => {
    await app.register(odinController, { prefix: '/v1/odin' })
}
