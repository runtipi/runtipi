
import { handleApiError } from "@/actions/utils/handle-api-error";
import { getClass } from "src/inversify.config";

export async function GET() {
    try {
        const cache = getClass('ICache');
        const status = await cache.get('status')

        return Response.json({ success: true, status })
    } catch (e) {
        return handleApiError(e)
    }
}