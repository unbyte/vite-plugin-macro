import { ImportOption } from '@/core/helper/import'
import { NodePath } from '@babel/traverse'
import { Node, CallExpression, ImportDeclaration, Program } from '@babel/types'
import {
  normalizePathPattern,
  PathPatternNormalizer,
  projectDir,
} from '@/core/helper/path'
import { findImported, ImportedMacrosContainer } from '@/core/helper/traverse'
import {
  appendImports,
  appendToBody,
  prependImports,
  prependToBody,
} from '@/core/helper/transform'

export type MacroHelper = {
  /**
   * Prepend import statements to program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   * @return node path of the last inserted import statement,
   *   or undefined if imports param is array and length === 0
   */
  prependImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration> | undefined

  /**
   * Append import statements to the last import statement of the program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   * @return node path of the last inserted import statement
   *   or undefined if imports param is array and length === 0
   */
  appendImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration> | undefined

  /**
   * Find an import statement that has been in the target program already.
   * Note that findImported() will not resolve extension for moduleName automatically.
   * @param imports an import
   * @param loose match loosely, defaults to true, e.g:
   * `import { a as _a } from 'a'` will match `{ moduleName: 'a' }` and `{ moduleName: 'a', exportName: 'a' }`
   * @param program node path of the target program. use the one currently being handled by default.
   */
  findImported: (
    imports: ImportOption,
    loose?: boolean,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration> | undefined

  /**
   * Check if an import statement has been in the target program already.
   * Note that hasImported() will not resolve extension for moduleName automatically.
   * @param imports an import
   * @param loose match loosely, defaults to true, e.g:
   * `import { a as _a } from 'a'` will match `{ moduleName: 'a' }` and `{ moduleName: 'a', exportName: 'a' }`
   * @param program node path of the target program. use the one currently being handled by default.
   */
  hasImported: (
    imports: ImportOption,
    loose?: boolean,
    program?: NodePath<Program>
  ) => boolean

  /**
   * Prepend any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   * @return node path of the last inserted node
   */
  prependToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => NodePath

  /**
   * Append any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   * @return node path of the last inserted node
   */
  appendToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => NodePath

  /**
   * Normalize path pattern so can resolve file paths as import paths
   * @param path relative path or path pattern
   * @param root absolute file path of the project dir, default to projectDir('leaf')
   * @param importer absolute file path of the importer, default to current file
   *
   * e.g. search files by glob pattern and then import them
   *
   * ```typescript
   * // /src/example/a.ts
   * // /src/example/b.ts
   * // in /src/another/index.ts
   * const pattern = '../example/*.ts'
   * const { normalized, base, resolveImportPath } = normalizePathPattern(pattern)
   * const importPaths = glob.sync(normalized, { cwd: base }).map(resolveImportPath)
   *
   * // importPaths = ['../example/a.ts', '../example/b.ts']
   * ```
   */
  normalizePathPattern: (
    pattern: string,
    root?: string,
    importer?: string
  ) => PathPatternNormalizer

  /**
   * Get the directory of the root project or the nearest project.
   * @param which 'root' or 'leaf'
   */
  projectDir: (which: 'root' | 'leaf') => string

  /**
   * Check whether there are unexpanded macros under the path(s).
   * @param path the node path(s) to be checked, use the arguments of the current
   * call expression by default
   */
  containsMacros: (...paths: NodePath[]) => boolean[]
}

export function createHelper(
  thisPath: NodePath<CallExpression>,
  thisProgram: NodePath<Program>,
  thisFilepath: string,
  importedMacros: ImportedMacrosContainer
) {
  const helpers: MacroHelper = {
    findImported: (imp, loose = true, program = thisProgram) => {
      return findImported(program, imp, loose)
    },

    hasImported: (imp, loose = true, program = thisProgram) => {
      return findImported(program, imp, loose) !== undefined
    },

    prependImports: (imports, program = thisProgram) => {
      return prependImports(program, imports)
    },

    appendImports: (imports, program = thisProgram) => {
      return appendImports(program, imports)
    },

    prependToBody: (nodes, program = thisProgram) => {
      return prependToBody(program, nodes)
    },

    appendToBody: (nodes, program = thisProgram) => {
      return appendToBody(program, nodes)
    },

    normalizePathPattern: (
      pattern,
      root = projectDir('leaf'),
      importer = thisFilepath
    ) => {
      return normalizePathPattern(pattern, importer, root)
    },

    projectDir,

    containsMacros: (...paths) => {
      return importedMacros.testContainsMacros(
        paths.length ? paths : thisPath.get('arguments')
      )
    },
  }

  return helpers
}
