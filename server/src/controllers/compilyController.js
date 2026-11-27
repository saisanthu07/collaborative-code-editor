import crypto from "crypto";
import CompilySnippet from "../models/CompilySnippet.js";
import Execution from "../models/Execution.js";
import { runCode, runCodeBatch } from "../services/executionService.js";
import { logEvent } from "../utils/logger.js";

export async function execute(req, res, next) {
  try {
    const { language, sourceCode, stdin = "", activeFileName, files } = req.body;
    const result = await runCode({
      language,
      sourceCode,
      stdin,
      activeFileName,
      files,
    });

    await Execution.create({
      roomId: `compily:${req.user._id.toString()}`,
      userId: req.user._id,
      language,
      sourceCode,
      stdin,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      executionTime: result.executionTime,
      memory: result.memory,
    }).catch(() => {});

    logEvent("COMPILY_EXECUTE", {
      userId: req.user._id.toString(),
      language,
      status: result.status,
    });

    res.json({ execution: result });
  } catch (err) {
    next(err);
  }
}

export async function executeBatch(req, res, next) {
  try {
    const { language, sourceCode, activeFileName, files, cases } = req.body;
    const results = await runCodeBatch({
      language,
      sourceCode,
      activeFileName,
      files,
      cases,
    });

    logEvent("COMPILY_EXECUTE_BATCH", {
      userId: req.user._id.toString(),
      language,
      caseCount: cases.length,
    });

    res.json({ results });
  } catch (err) {
    next(err);
  }
}

export async function listSnippets(req, res, next) {
  try {
    const snippets = await CompilySnippet.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    res.json({ snippets });
  } catch (err) {
    next(err);
  }
}

export async function saveSnippet(req, res, next) {
  try {
    const { id, title, language, code, stdin } = req.body;

    if (id) {
      const updated = await CompilySnippet.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { $set: { title, language, code, stdin } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: "Snippet not found" });
      }
      return res.json({ snippet: updated });
    }

    const snippet = await CompilySnippet.create({
      userId: req.user._id,
      title,
      language,
      code,
      stdin,
    });

    logEvent("COMPILY_SNIPPET_CREATE", {
      userId: req.user._id.toString(),
      snippetId: snippet._id.toString(),
      language,
    });

    res.status(201).json({ snippet });
  } catch (err) {
    next(err);
  }
}

export async function deleteSnippet(req, res, next) {
  try {
    const deleted = await CompilySnippet.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ error: "Snippet not found" });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function toggleShareSnippet(req, res, next) {
  try {
    const snippet = await CompilySnippet.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!snippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    snippet.isPublic = Boolean(req.body.isPublic);
    if (snippet.isPublic && !snippet.shareSlug) {
      snippet.shareSlug = crypto.randomBytes(5).toString("hex");
    }
    await snippet.save();

    logEvent("COMPILY_SNIPPET_SHARE", {
      userId: req.user._id.toString(),
      snippetId: snippet._id.toString(),
      isPublic: snippet.isPublic,
    });

    res.json({ snippet });
  } catch (err) {
    next(err);
  }
}

export async function getPublicSnippet(req, res, next) {
  try {
    const snippet = await CompilySnippet.findOne({
      shareSlug: req.params.slug,
      isPublic: true,
    })
      .populate("userId", "username avatar")
      .lean();

    if (!snippet) {
      return res.status(404).json({ error: "Shared snippet not found or is private" });
    }

    const author =
      snippet.userId && typeof snippet.userId === "object"
        ? {
            username: snippet.userId.username || "Developer",
            avatar: snippet.userId.avatar || "",
          }
        : { username: "Developer", avatar: "" };

    res.json({
      snippet: {
        _id: snippet._id,
        title: snippet.title,
        language: snippet.language,
        code: snippet.code,
        stdin: snippet.stdin,
        shareSlug: snippet.shareSlug,
        updatedAt: snippet.updatedAt,
        author,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function forkPublicSnippet(req, res, next) {
  try {
    const source = await CompilySnippet.findOne({
      shareSlug: req.params.slug,
      isPublic: true,
    }).lean();

    if (!source) {
      return res.status(404).json({ error: "Shared snippet not found or is private" });
    }

    const forkedTitle = `${source.title} (Fork)`.slice(0, 100);
    const snippet = await CompilySnippet.create({
      userId: req.user._id,
      title: forkedTitle,
      language: source.language,
      code: source.code,
      stdin: source.stdin || "",
    });

    logEvent("COMPILY_SNIPPET_FORK", {
      userId: req.user._id.toString(),
      sourceSlug: req.params.slug,
      snippetId: snippet._id.toString(),
    });

    res.status(201).json({ snippet });
  } catch (err) {
    next(err);
  }
}
