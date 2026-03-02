/**
 * Frida GUM type stubs for TypeScript.
 *
 * These provide minimal type information for the Frida Gum API
 * used in WhaLe hook scripts. For full types, install @anthropic/frida-gum-types.
 */

declare global {
  /** Intercept native function calls. */
  const Interceptor: {
    attach(
      target: NativePointer,
      callbacks: {
        onEnter?: (this: InvocationContext, args: InvocationArguments) => void
        onLeave?: (this: InvocationContext, retval: InvocationReturnValue) => void
      },
    ): InvocationListener
    detachAll(): void
  }

  /** Access loaded modules and their exports. */
  const Module: {
    getExportByName(moduleName: string | null, exportName: string): NativePointer
    findExportByName(moduleName: string | null, exportName: string): NativePointer | null
    enumerateExports(moduleName: string): ModuleExport[]
    findBaseAddress(moduleName: string): NativePointer | null
  }

  /** Read/write process memory. */
  const Memory: {
    readU8(address: NativePointer): number
    readU16(address: NativePointer): number
    readU32(address: NativePointer): number
    readFloat(address: NativePointer): number
    readDouble(address: NativePointer): number
    writeU8(address: NativePointer, value: number): void
    writeU16(address: NativePointer, value: number): void
    writeU32(address: NativePointer, value: number): void
    writeFloat(address: NativePointer, value: number): void
    writeDouble(address: NativePointer, value: number): void
    readByteArray(address: NativePointer, length: number): ArrayBuffer | null
    writeByteArray(address: NativePointer, bytes: ArrayBuffer | number[]): void
    protect(address: NativePointer, size: number, protection: string): boolean
  }

  /** Pointer type representing a native memory address. */
  interface NativePointer {
    add(offset: number | NativePointer): NativePointer
    sub(offset: number | NativePointer): NativePointer
    isNull(): boolean
    readU8(): number
    readU16(): number
    readU32(): number
    readFloat(): number
    readDouble(): number
    readPointer(): NativePointer
    readUtf8String(size?: number): string | null
    writeU8(value: number): NativePointer
    writeU16(value: number): NativePointer
    writeU32(value: number): NativePointer
    writeFloat(value: number): NativePointer
    writeDouble(value: number): NativePointer
    writePointer(value: NativePointer): NativePointer
    writeUtf8String(value: string): NativePointer
  }

  interface InvocationContext {
    returnAddress: NativePointer
    threadId: number
  }

  type InvocationArguments = NativePointer[]

  interface InvocationReturnValue extends NativePointer {
    replace(value: NativePointer | number): void
  }

  interface InvocationListener {
    detach(): void
  }

  interface ModuleExport {
    type: string
    name: string
    address: NativePointer
  }

  /** Create a native pointer from an address. */
  function ptr(address: string | number): NativePointer

  /** Null pointer constant. */
  const NULL: NativePointer
}

export {}
