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
