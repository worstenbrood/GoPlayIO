// https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
export function formatTime(ms) {
    const seconds = Math.floor(Math.abs(ms / 1000))
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.round(seconds % 60)
    const t = [h, m > 9 ? m : h ? '0' + m : m || '0', s > 9 ? s : '0' + s]
        .filter(Boolean)
        .join(':')
    return ms < 0 && seconds ? `-${t}` : t
}

export async function parallel(arr, fn, threads = 2) {
    const result = [];
    while (arr.length) {
      const res = await Promise.all(arr.splice(0, threads).map(x => fn(x)));
      result.push(res);
    }
    return result.flat();
}