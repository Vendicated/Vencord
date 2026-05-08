/* eslint-disable */
import { errors } from '../util.js'

const { INVALID, GONE, MISMATCH, MOD_ERR, SYNTAX, SECURITY, DISALLOWED } = errors

export class Sink {
  constructor () {
  }
  write (chunk) {
  }
  close () {
  }
}

export class FileHandle {
  constructor () {
    this._path = ''
  }

  /**
   * @public - publicly available to the wrapper
   * @returns {Promise<File>}
   */
  async getFile () {
    return new File([], '')
  }

  async createWritable () {
  }

  /**
   * @public - Publicly available to the wrapper
   * @param {FileHandle} other
   * @returns {Promise<boolean>}
   */
  async isSameEntry (other) {
    return other._path === this._path
  }
}

export class FolderHandle {
  constructor () {
    this._path = ''
  }

  /**
   * @public - Publicly available to the wrapper
   * @returns {AsyncGenerator<[string, FileHandle | FolderHandle]>}
   */
  async * entries () {
    yield
  }

  /**
   * @public - Publicly available to the wrapper
   * @param {FolderHandle} other
   * @returns {Promise<boolean>}
   */
  async isSameEntry (other) {
    return other._path === this._path
  }

  /**
   * @public - Publicly available to the wrapper
   * @param {string} name
   * @param {{ create: boolean; }} options
   * @return {Promise<FolderHandle>}
   */
  async getDirectoryHandle (name, options) {
    return new FolderHandle()
  }

  /**
   * @public - Publicly available to the wrapper
   * @param {string} name - The filename of the FileHandle to get
   * @param {{ create: boolean; }} options
   * @return {Promise<FileHandle>}
   */
  async getFileHandle (name, options) {
    return new FileHandle()
  }

  /**
   * Removes the entry named `name` in the directory represented
   * by directoryHandle. If that entry is a directory, its
   * contents will also be deleted recursively.
   *
   * Attempting to delete a file or directory that does not
   * exist is considered success.
   *
   * @public - Publicly available to the wrapper
   * @param {string} name - The name of the file or folder to remove in this directory
   * @param {{ recursive: boolean; }} options
   * @return {Promise<void>}
   */
  async removeEntry (name, options) {
  }
}

const fs = new FolderHandle('')

export default () => fs
