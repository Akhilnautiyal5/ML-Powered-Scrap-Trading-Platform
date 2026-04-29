from pathlib import Path

path = Path('client/src/pages/ProductDetails.jsx')
text = path.read_text(encoding='utf-8')
old = '''                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    No Image
                                                </div>
                                            )}
                                                <Link
                                                    to={`/product/${item.id}`}
                                                    className="w-full btn-gradient !py-2 !text-[10px]"
                                                >'''
new = '''                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    No Image
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                <Link
                                                    to={`/product/${item.id}`}
                                                    className="w-full btn-gradient !py-2 !text-[10px]"
                                                >'''
if old not in text:
    print('Pattern not found')
else:
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('Replaced successfully')
