import { HttpError } from "../middleware/errorHandler.js";
import { isDuplicateEntry, parseId } from "../middleware/validation.js";
import * as bookmarks from "../models/bookmarkModel.js";
import * as jobs from "../models/jobModel.js";

export async function listMyBookmarks(request, response) {
  response.status(200).json({ data: await bookmarks.findBookmarksByUser(request.user.id) });
}

export async function addBookmark(request, response) {
  const job = await jobs.findJobById(parseId(request.params.id));

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  const existing = await bookmarks.findBookmark(request.user.id, job.id);
  if (existing) {
    response.status(200).json({ bookmark: existing });
    return;
  }

  try {
    const bookmark = await bookmarks.createBookmark({ user_id: request.user.id, job_id: job.id });
    response.status(201).json({ bookmark });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      response.status(200).json({ bookmark: await bookmarks.findBookmark(request.user.id, job.id) });
      return;
    }
    throw error;
  }
}

export async function removeBookmark(request, response) {
  const jobId = parseId(request.params.id);
  const existing = await bookmarks.findBookmark(request.user.id, jobId);

  if (!existing) {
    throw new HttpError(404, "Bookmark not found");
  }

  await bookmarks.deleteBookmark(request.user.id, jobId);
  response.status(200).json({ message: "Bookmark removed" });
}
