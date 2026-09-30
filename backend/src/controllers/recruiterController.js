import { findDashboardSummary } from "../models/recruiterModel.js";

export async function getDashboard(request, response) {
  response.status(200).json(await findDashboardSummary(request.user.id));
}
